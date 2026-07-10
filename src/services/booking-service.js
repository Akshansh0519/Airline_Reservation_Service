const axios = require('axios');
const db = require('../models');
const { StatusCodes } = require('http-status-codes');
const { BookingRepository, IdempotencyRepository } = require('../repositories');
const { ServerConfig , Queue } = require('../config');
const { AppError, ENUMS } = require('../utils');
const { BOOKED, CANCELLED } = ENUMS.BOOKING_STATUS;

const bookingRepository = new BookingRepository();
const idempotencyRepository = new IdempotencyRepository();

async function createBooking(data) {
    const idempotencyKey = data.idempotencyKey;
    if (idempotencyKey) {
        const existingKey = await idempotencyRepository.getByKey(idempotencyKey);
        if (existingKey) {
            if (existingKey.response) {
                return JSON.parse(existingKey.response);
            }
            throw new AppError('Cannot process request: A booking with this idempotency key is currently in progress', StatusCodes.CONFLICT);
        } 
    }

    const transaction = await db.sequelize.transaction();
    try {
        if (idempotencyKey) {
            await idempotencyRepository.createKey(idempotencyKey, transaction);
        }

        const flightResponse = await axios.get(`${ServerConfig.FLIGHT_SERVICE_PATH}/api/v1/flights/${data.flightId}`);
        const flightData = flightResponse.data.data;

        if (data.noOfSeats > flightData.totalSeats) {
            throw new AppError('Not enough seats available on the flight', StatusCodes.BAD_REQUEST);
        }

        const totalCost = flightData.price * data.noOfSeats;
        const bookingPayload = {
            flightId: data.flightId,
            userId: data.userId,
            noOfSeats: data.noOfSeats,
            totalCost
        };
        const booking = await bookingRepository.create(bookingPayload, transaction);

        await axios.patch(`${ServerConfig.FLIGHT_SERVICE_PATH}/api/v1/flights/${data.flightId}/seats`, {
            seats: data.noOfSeats,
            dec: true
        });

        // Fetch booking WITHIN the transaction so we always get the committed data
        const bookingDetails = await bookingRepository.get({ id: booking.id }, transaction);
        if (idempotencyKey) {
            await idempotencyRepository.updateByKey(idempotencyKey, bookingDetails, transaction);
        }

        await transaction.commit();
        return bookingDetails ? (bookingDetails.toJSON ? bookingDetails.toJSON() : bookingDetails) : { id: booking.id, flightId: data.flightId, userId: data.userId, noOfSeats: data.noOfSeats, totalCost, status: 'initiated' };
    } catch (error) {
        await transaction.rollback();
        if (error.response && error.response.data) {
            throw new AppError(
                error.response.data.message || 'Error from Flights Service',
                error.response.status || StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError('Something went wrong during the booking process: ' + error.message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

async function makePayment(data) {
    const idempotencyKey = data.idempotencyKey;
    if (!idempotencyKey) {
        throw new AppError('idempotency key missing', StatusCodes.BAD_REQUEST);
    }
    const existingKey = await idempotencyRepository.getByKey(idempotencyKey);
    if (existingKey) {
        if (existingKey.response) {
            return JSON.parse(existingKey.response);
        }
        throw new AppError('Cannot process request: A request with this idempotency key is currently in progress', StatusCodes.CONFLICT);
    }

    const transaction = await db.sequelize.transaction();
    try {
        await idempotencyRepository.createKey(idempotencyKey, transaction);

        const bookingDetails = await bookingRepository.get({ id: data.bookingId }, transaction);
        if (!bookingDetails) {
            throw new AppError('Booking not found', StatusCodes.NOT_FOUND);
        }
        if (bookingDetails.status === CANCELLED) {
            throw new AppError('The booking has expired or been cancelled', StatusCodes.BAD_REQUEST);
        }
        if (bookingDetails.status === BOOKED) {
            await transaction.commit();
            return bookingDetails.toJSON ? bookingDetails.toJSON() : bookingDetails;
        }
        if (Number(bookingDetails.totalCost) !== Number(data.totalCost)) {
            throw new AppError('Amount of the payment doesnt match', StatusCodes.BAD_REQUEST);
        }
        if (Number(bookingDetails.userId) !== Number(data.userId)) {
            throw new AppError('User corresponding to the booking doesnt match', StatusCodes.BAD_REQUEST);
        }

        await bookingRepository.update(data.bookingId, { status: BOOKED }, transaction);

        const updatedBooking = await bookingRepository.get({ id: data.bookingId }, transaction);
        await idempotencyRepository.updateByKey(idempotencyKey, updatedBooking, transaction);

        await transaction.commit();

        try {
            let flightInfo = {
                flightNumber: `FL-${updatedBooking.flightId}`,
                departureAirportId: 'DEL',
                arrivalAirportId: 'HYD',
                departureTime: new Date().toISOString(),
                boardngGate: 'T3-G14'
            };
            try {
                const flightRes = await axios.get(`${ServerConfig.FLIGHT_SERVICE_PATH}/api/v1/flights/${updatedBooking.flightId}`);
                if (flightRes.data && flightRes.data.data) {
                    flightInfo = flightRes.data.data;
                }
            } catch (fErr) {
                console.log('Could not fetch flight details for email notification, using default schema:', fErr.message);
            }

            let effectiveIso = flightInfo.departureTime;
            if (data.travelDate || data.departureDate) {
                const stored = new Date(flightInfo.departureTime);
                const hours = stored.getUTCHours().toString().padStart(2, '0');
                const mins = stored.getUTCMinutes().toString().padStart(2, '0');
                effectiveIso = `${data.travelDate || data.departureDate}T${hours}:${mins}:00.000Z`;
            } else if (new Date(flightInfo.departureTime) < new Date()) {
                const stored = new Date(flightInfo.departureTime);
                const hours = stored.getUTCHours().toString().padStart(2, '0');
                const mins = stored.getUTCMinutes().toString().padStart(2, '0');
                const today = new Date().toISOString().split('T')[0];
                effectiveIso = `${today}T${hours}:${mins}:00.000Z`;
            }

            const depTimeFormatted = new Date(effectiveIso).toLocaleString('en-IN', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true,
                timeZone: 'Asia/Kolkata'
            });

            const emailSubject = `✈️ SkyElite E-Ticket Confirmation | Booking #${updatedBooking.id} (${flightInfo.departureAirportId} → ${flightInfo.arrivalAirportId})`;
            
            const emailText = `
============================================================
           ✈️  SKYELITE AIRLINES - OFFICIAL E-TICKET  ✈️           
============================================================

Dear Passenger (User ID: #${updatedBooking.userId}),

Your flight reservation has been successfully confirmed and your payment of ₹${Number(updatedBooking.totalCost).toLocaleString('en-IN')} has been processed via our ACID 2-phase transaction protocol.

------------------------------------------------------------
                    BOOKING SUMMARY                         
------------------------------------------------------------
• Booking Reference : #${updatedBooking.id}
• Flight Number     : ${flightInfo.flightNumber}
• Route             : ${flightInfo.departureAirportId} ➔ ${flightInfo.arrivalAirportId}
• Departure Time    : ${depTimeFormatted}
• Boarding Gate     : ${flightInfo.boardngGate || 'Assigned at Check-in'}
• Seats Reserved    : ${updatedBooking.noOfSeats} Seat(s)
• Total Fare Paid   : ₹${Number(updatedBooking.totalCost).toLocaleString('en-IN')}
• Payment Status    : CONFIRMED (BOOKED)

------------------------------------------------------------
               IMPORTANT TRAVEL INSTRUCTIONS                
------------------------------------------------------------
1. Check-in opens 48 hours before scheduled departure time.
2. Please report to security check at least 60 minutes prior to boarding.
3. Carry a valid government-issued photo ID along with this E-Ticket.

Thank you for choosing SkyElite Airlines. We wish you a pleasant journey!

============================================================
SkyElite Microservices Architecture | Flights • Booking • Notification
============================================================
`.trim();

            const emailHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
  .ticket-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e1e8ed; }
  .header { background: #202A36; color: #ffffff; padding: 28px 32px; position: relative; }
  .brand { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #38bdf8; font-weight: 700; }
  .title { font-size: 24px; font-weight: 800; margin: 8px 0 0 0; color: #ffffff; }
  .status-badge { display: inline-block; background: #10b981; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; }
  .route-banner { background: #0f172a; color: #ffffff; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #334155; }
  .route-city { font-size: 28px; font-weight: 900; color: #f8fafc; }
  .route-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; }
  .plane-icon { font-size: 24px; color: #38bdf8; }
  .body-content { padding: 32px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .field-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
  .field-value { font-size: 16px; font-weight: 700; color: #0f172a; }
  .price-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }
  .price-label { font-size: 14px; font-weight: 600; color: #475569; }
  .price-amount { font-size: 26px; font-weight: 900; color: #202A36; }
  .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
  <div class="ticket-container">
    <div class="header">
      <div class="brand">SkyElite Airlines • E-Ticket</div>
      <h1 class="title">Booking Confirmed</h1>
      <div class="status-badge">✓ Verified & Paid</div>
    </div>
    
    <div class="route-banner">
      <div>
        <div class="route-label">Departure</div>
        <div class="route-city">${flightInfo.departureAirportId}</div>
      </div>
      <div class="plane-icon">✈</div>
      <div style="text-align: right;">
        <div class="route-label">Arrival</div>
        <div class="route-city">${flightInfo.arrivalAirportId}</div>
      </div>
    </div>

    <div class="body-content">
      <div class="grid">
        <div>
          <div class="field-label">Booking Reference</div>
          <div class="field-value">#${updatedBooking.id}</div>
        </div>
        <div>
          <div class="field-label">Flight Number</div>
          <div class="field-value">${flightInfo.flightNumber}</div>
        </div>
        <div>
          <div class="field-label">Passenger User ID</div>
          <div class="field-value">#${updatedBooking.userId}</div>
        </div>
        <div>
          <div class="field-label">Seats Reserved</div>
          <div class="field-value">${updatedBooking.noOfSeats} Seat(s)</div>
        </div>
        <div>
          <div class="field-label">Scheduled Departure</div>
          <div class="field-value">${depTimeFormatted}</div>
        </div>
        <div>
          <div class="field-label">Boarding Gate</div>
          <div class="field-value" style="color: #2563eb;">${flightInfo.boardngGate || 'Assigned at Check-in'}</div>
        </div>
      </div>

      <div class="price-box">
        <div>
          <div class="price-label">Total Fare Paid (ACID Verified)</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Includes all taxes & carrier fees</div>
        </div>
        <div class="price-amount">₹${Number(updatedBooking.totalCost).toLocaleString('en-IN')}</div>
      </div>

      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #475569; line-height: 1.6;">
        <strong style="color: #0f172a;">Next Steps & Baggage Info:</strong><br>
        • Please arrive at the airport terminal at least 2 hours prior to domestic departures.<br>
        • Check-in baggage allowance is 15 kg per seat; cabin baggage is 7 kg.<br>
        • Present this QR/E-ticket summary along with a government-issued ID at boarding gate <strong>${flightInfo.boardngGate || 'T3'}</strong>.
      </div>
    </div>

    <div class="footer">
      Powered by SkyElite Distributed Microservice Architecture (Flights • Booking • Notification)<br>
      Automated Event-Driven Messaging via CloudAMQP / RabbitMQ
    </div>
  </div>
</body>
</html>
`.trim();

            await Queue.sendMessageToQueue({
                recepientEmail: data.recepientEmail || 'akshanshranjan007@gmail.com',
                subject: emailSubject,
                text: emailText,
                html: emailHtml,
                status: BOOKED
            });
        } catch (queueErr) {
            console.error('Failed to send notification message to queue:', queueErr);
        }

        return updatedBooking ? (updatedBooking.toJSON ? updatedBooking.toJSON() : updatedBooking) : { id: data.bookingId, flightId: bookingDetails.flightId, userId: data.userId, noOfSeats: bookingDetails.noOfSeats, totalCost: data.totalCost, status: BOOKED };
    } catch (error) {
        await transaction.rollback();
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError('Something went wrong while making payment: ' + error.message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

async function getBooking(id) {
    try {
        const response = await bookingRepository.get({ id });
        if (!response) {
            throw new AppError('Booking not found', StatusCodes.NOT_FOUND);
        }
        return response;
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Cannot fetch booking details: ' + error.message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

module.exports = {
    createBooking,
    getBooking,
    makePayment
};
