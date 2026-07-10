# 🚀 The Ultimate 100% Free Microservice Deployment Guide (`$0/Month Forever`)

This master deployment guide is specifically designed for students, developers, and engineers deploying the complete **SkyElite Airline Reservation Ecosystem** (`Flights Search Service`, `Booking & Payment Service`, `Notification Service`, `RabbitMQ`, `MySQL`, and `Next.js Frontend`) live to production at **$0.00/month cost** for recruiters and portfolio demonstrations.

---

## 🏗️ High-Level Production Architecture & Free Stack

```mermaid
flowchart TB
  subgraph Client Layer
    Users[Recruiters & Users / Web Browsers]
  end

  subgraph Global Edge CDN (Vercel - Free Tier)
    Frontend[SkyElite Next.js 16 Frontend App]
  end

  subgraph Cloud Web Services (Render.com - Free Tier)
    Flights[Flights Service - Port 3000]
    Booking[Booking Service - Port 4000]
    Noti[Notification Service - Port 3002]
  end

  subgraph Managed Data & Queue Layer ($0/Month Managed)
    MySQL[(Aiven.io Managed MySQL 8.0)]
    RabbitMQ[(CloudAMQP Managed RabbitMQ)]
  end

  subgraph Cold Start Defeater (UptimeRobot - Free Tier)
    Pinger[24/7 HTTP Monitor Pinger]
  end

  Users --> Frontend
  Frontend -- HTTPS API Proxy --> Flights
  Frontend -- HTTPS API Proxy --> Booking
  Booking -- HTTPS Axios --> Flights
  Booking -- Publishes JSON --> RabbitMQ
  RabbitMQ -- Consumes --> Noti
  Flights --> MySQL
  Booking --> MySQL
  Noti --> MySQL
  Noti -- Nodemailer SMTP --> Gmail[Gmail SMTP / User Inbox]
  Pinger -.-|Pings every 10 mins| Flights
  Pinger -.-|Pings every 10 mins| Booking
  Pinger -.-|Pings every 10 mins| Noti
```

---

## 🔑 Phase 1: Managed Infrastructure Setup ($0/Month)

Before deploying Node.js code, you must provision your cloud database and message broker so your microservices can connect on boot.

### Step 1.1: Free Managed MySQL Database (`Aiven.io`)
Aiven provides a permanent **100% Free MySQL 8.0 instance** (1 CPU, 1 GB RAM, 5 GB Storage) with zero credit card requirements.

1. Go to [Aiven.io](https://aiven.io) and click **Sign Up Free** (use GitHub or Email).
2. On your console, click **Create Service**.
3. Select **MySQL** $\to$ Choose your preferred cloud/region (e.g., `AWS us-east-1` or `DigitalOcean eu-west`).
4. Select the **Free Plan ($0/month)** at the bottom and click **Create Service**.
5. Once your service status says **Running**, look at the **Connection Details** tab and note down:
   * **Host**: `mysql-skyelite-free.aivencloud.com` *(example)*
   * **Port**: `20614` *(example)*
   * **User**: `avnadmin`
   * **Password**: `YOUR_AIVEN_PASSWORD_HERE`
6. **Create Your 3 Microservice Schemas**:
   Open **DBeaver**, **MySQL Workbench**, or your local terminal to connect via your Aiven credentials, and execute:
   ```sql
   CREATE DATABASE IF NOT EXISTS flights_development;
   CREATE DATABASE IF NOT EXISTS bookings_development;
   CREATE DATABASE IF NOT EXISTS notification_development;
   ```
   *(Verify all 3 databases appear in your schema navigation bar).*

---

### Step 1.2: Free Managed RabbitMQ Queue (`CloudAMQP`)
CloudAMQP provides the **Little Lemur Plan ($0/month)** allowing up to 1,000,000 messages/month and 20 concurrent TCP connections.

1. Go to [CloudAMQP.com](https://www.cloudamqp.com) and sign up with GitHub.
2. Click **Create New Instance**.
3. Enter Name: `skyelite-rabbitmq` $\to$ Select the **Little Lemur (Free)** plan.
4. Select any available region and click **Create Instance**.
5. Click on your newly created instance name and copy the **AMQP URL** from the overview screen.
   * **Format**: `amqps://username:password@lemur.cloudamqp.com/vhost`
   * Keep this exact string ready; both `Booking_Service` and `Notification-Service-Flights` will connect to it.

---

### Step 1.3: Generate Gmail App Password (`For Notification Service`)
Standard Gmail account login passwords cannot be used for programmatic SMTP access. You must create a **16-character App Password**.

1. Ensure your Gmail account has **2-Step Verification** enabled ([Google Security Dashboard](https://myaccount.google.com/security)).
2. Go to **App Passwords** ([https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
3. Under **App name**, type `SkyElite Notification Service` and click **Create**.
4. Copy the generated 16-character string (e.g., `abcd efgh ijkl mnop`). Remove any spaces so it reads `abcdefghijklmnop`.

---

## ☁️ Phase 2: Deploying Backend Microservices to Render.com

We will deploy your three Node.js repositories as **3 separate Free Web Services** on [Render.com](https://render.com).

### Step 2.1: Deploy Flights Search Service (`Flights_Booking_Service`)
1. Log into [Render.com](https://render.com) using GitHub $\to$ Click **New +** $\to$ **Web Service**.
2. Select your `Flight_Search_API` / `Flights_Booking_Service` repository and click **Connect**.
3. Configure settings:
   * **Name**: `skyelite-flights-service`
   * **Region**: Any (`US East` or `Frankfurt`)
   * **Branch**: `master` or `main`
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npx sequelize db:migrate`
   * **Start Command**: `npm start`
   * **Instance Type**: **Free ($0/month)**
4. Scroll to **Environment Variables** $\to$ Click **Add Environment Variable** for each row below:

| Key | Value | Description |
| :--- | :--- | :--- |
| `PORT` | `10000` | Render requires web services to bind to port `10000`. |
| `DB_HOST` | `your-aiven-host.aivencloud.com` | Your Aiven MySQL host address. |
| `DB_PORT` | `20614` | Your Aiven MySQL custom port. |
| `DB_USER` | `avnadmin` | Your Aiven MySQL username. |
| `DB_PASSWORD` | `YOUR_AIVEN_PASSWORD_HERE` | Your Aiven MySQL password. |
| `DB_NAME` | `flights_development` | The flights schema created in Step 1.1. |

5. Click **Create Web Service**.
6. Once deployed, Render assigns a live URL: `https://skyelite-flights-service.onrender.com`.
7. **Verify Live Health**: Visit `https://skyelite-flights-service.onrender.com/api/v1/info` in your browser. You should see `{"success": true, "msg": "api is alive"}`.

---

### Step 2.2: Deploy Notification & Email Service (`Notification-Service-Flights`)
1. Click **New +** $\to$ **Web Service** $\to$ Connect your `Airline-Notification-Service` repository.
2. Configure settings:
   * **Name**: `skyelite-notification-service`
   * **Build Command**: `npm install && npx sequelize db:migrate`
   * **Start Command**: `npm start`
   * **Instance Type**: **Free ($0/month)**
3. Add the following **Environment Variables**:

| Key | Value | Description |
| :--- | :--- | :--- |
| `PORT` | `10000` | Render web service port bind. |
| `DB_HOST` | `your-aiven-host.aivencloud.com` | Your Aiven MySQL host address. |
| `DB_PORT` | `20614` | Your Aiven MySQL custom port. |
| `DB_USER` | `avnadmin` | Your Aiven MySQL username. |
| `DB_PASSWORD` | `YOUR_AIVEN_PASSWORD_HERE` | Your Aiven MySQL password. |
| `DB_NAME` | `notification_development` | The notification schema from Step 1.1. |
| `RABBITMQ_URL` | `amqps://user:pass@lemur.cloudamqp.com/vhost` | Your full CloudAMQP URL from Step 1.2. |
| `RABBITMQ_QUEUE_NAME` | `Notification-Queue` | Exact queue name shared with Booking Service. |
| `GMAIL_EMAIL` | `your_email@gmail.com` | Your sender Gmail address. |
| `GMAIL_PASSWORD` | `abcdefghijklmnop` | The 16-character Gmail App Password from Step 1.3. |

4. Click **Create Web Service**. When the deployment completes, check the **Logs** tab: you should see `Connected to RabbitMQ` and `Ready to send emails`.

---

### Step 2.3: Deploy Booking & Payment Service (`Booking_Service`)
1. Click **New +** $\to$ **Web Service** $\to$ Connect your `Airline_Reservation_Service` repository.
2. Configure settings:
   * **Name**: `skyelite-booking-service`
   * **Build Command**: `npm install && npx sequelize db:migrate`
   * **Start Command**: `npm start`
   * **Instance Type**: **Free ($0/month)**
3. Add the following **Environment Variables**:

| Key | Value | Description |
| :--- | :--- | :--- |
| `PORT` | `10000` | Render web service port bind. |
| `DB_HOST` | `your-aiven-host.aivencloud.com` | Your Aiven MySQL host address. |
| `DB_PORT` | `20614` | Your Aiven MySQL custom port. |
| `DB_USER` | `avnadmin` | Your Aiven MySQL username. |
| `DB_PASSWORD` | `YOUR_AIVEN_PASSWORD_HERE` | Your Aiven MySQL password. |
| `DB_NAME` | `bookings_development` | The booking schema from Step 1.1. |
| `FLIGHT_SERVICE_PATH` | `https://skyelite-flights-service.onrender.com` | **CRITICAL**: Paste the live Render URL from Step 2.1 without trailing slashes. |
| `RABBITMQ_URL` | `amqps://user:pass@lemur.cloudamqp.com/vhost` | Your full CloudAMQP URL from Step 1.2. |
| `RABBITMQ_QUEUE_NAME` | `Notification-Queue` | Exact queue name shared with Notification Service. |

4. Click **Create Web Service**. Once running, note your live URL: `https://skyelite-booking-service.onrender.com`.

---

## 🌐 Phase 3: Deploying Next.js Frontend to Vercel

With all three backend microservices running on HTTPS endpoints, we can now build and deploy the Next.js user portal on [Vercel.com](https://vercel.com).

1. Log into **Vercel** with GitHub $\to$ Click **Add New Project**.
2. Select your `Flight_Search_API` / `Flights_Booking_Service` repository $\to$ Click **Import**.
3. Under **Root Directory**, click **Edit** $\to$ Select the `frontend` folder and confirm (`frontend`).
4. Expand the **Environment Variables** section and add the exact production backend URLs:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_FLIGHTS_API` | `https://skyelite-flights-service.onrender.com` | Your live Flights Service URL on Render. |
| `NEXT_PUBLIC_BOOKING_API` | `https://skyelite-booking-service.onrender.com` | Your live Booking Service URL on Render. |

5. Click **Deploy**. Vercel will build the frontend with zero configuration and assign you a global edge CDN URL (`https://skyelite-airline-portal.vercel.app`).

---

## ⚡ Phase 4: Defeating Cold Starts for Recruiters ($0/Month)

### The "15-Minute Sleep" Problem
Because Render Free Tier web services go to sleep after 15 minutes of inactivity, the very first request from a recruiter visiting your portfolio might take `~30 to 45 seconds` to wake up all three microservices.

### The Permanent Free Fix (`UptimeRobot`)
You can keep all three microservices awake 24/7 forever without paying anything by configuring automated HTTP monitors.

1. Sign up for a free account on [UptimeRobot.com](https://uptimerobot.com).
2. Click **Add New Monitor** $\to$ Choose **HTTP(s)**.
3. Create **Monitor #1 (Flights Service)**:
   * **Friendly Name**: `SkyElite Flights Wakeup`
   * **URL**: `https://skyelite-flights-service.onrender.com/api/v1/info`
   * **Monitoring Interval**: `10 minutes`
   * Click **Create Monitor**.
4. Create **Monitor #2 (Booking Service)**:
   * **Friendly Name**: `SkyElite Booking Wakeup`
   * **URL**: `https://skyelite-booking-service.onrender.com/api/v1/bookings/1`
   * **Monitoring Interval**: `10 minutes`
   * Click **Create Monitor**.
5. Create **Monitor #3 (Notification Service)**:
   * **Friendly Name**: `SkyElite Notification Wakeup`
   * **URL**: `https://skyelite-notification-service.onrender.com`
   * **Monitoring Interval**: `10 minutes`
   * Click **Create Monitor**.

Your entire distributed system will now respond **instantaneously (< 200ms)** to every single recruiter who visits your live demo!

---

## 📊 Consolidated Master Environment Reference Matrix

When troubleshooting or re-deploying, reference this complete matrix:

### `Flights_Booking_Service` (`Render.com`)
```env
PORT=10000
DB_HOST=mysql-xxx.aivencloud.com
DB_PORT=20614
DB_USER=avnadmin
DB_PASSWORD=YOUR_AIVEN_PASSWORD_HERE
DB_NAME=flights_development
```

### `Notification-Service-Flights` (`Render.com`)
```env
PORT=10000
DB_HOST=mysql-xxx.aivencloud.com
DB_PORT=20614
DB_USER=avnadmin
DB_PASSWORD=YOUR_AIVEN_PASSWORD_HERE
DB_NAME=notification_development
RABBITMQ_URL=amqps://user:pass@lemur.cloudamqp.com/vhost
RABBITMQ_QUEUE_NAME=Notification-Queue
GMAIL_EMAIL=your_email@gmail.com
GMAIL_PASSWORD=abcdefghijklmnop
```

### `Booking_Service` (`Render.com`)
```env
PORT=10000
DB_HOST=mysql-xxx.aivencloud.com
DB_PORT=20614
DB_USER=avnadmin
DB_PASSWORD=YOUR_AIVEN_PASSWORD_HERE
DB_NAME=bookings_development
FLIGHT_SERVICE_PATH=https://skyelite-flights-service.onrender.com
RABBITMQ_URL=amqps://user:pass@lemur.cloudamqp.com/vhost
RABBITMQ_QUEUE_NAME=Notification-Queue
```

### `frontend` (`Vercel.com`)
```env
NEXT_PUBLIC_FLIGHTS_API=https://skyelite-flights-service.onrender.com
NEXT_PUBLIC_BOOKING_API=https://skyelite-booking-service.onrender.com
```

---

## ✅ End-to-End Live Verification Test

To prove to yourself and recruiters that your deployed ecosystem works perfectly:
1. Open your live Vercel frontend URL (`https://skyelite-airline-portal.vercel.app`).
2. Search for any flight (e.g., **CCU $\to$ IGA**) and click **Select Flight**.
3. Enter your email (`yourname@gmail.com`) and choose **5 Seats**.
4. Click **Proceed to Payment ($17,500)**.
5. Watch the interface display **`Success (`status: "booked"`)`**.
6. Check your email inbox within 3 seconds: you will receive your **`Flight booked`** confirmation email sent via your live RabbitMQ CloudAMQP queue and Notification Service!
