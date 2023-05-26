# Telegram Bank Bot

I check my bank accounts every day, and it can become cumbersome or easy to
forget. To simplify the process, I've built the Telegram Bank Text app. It
automates the retrieval of bank account information and sends automatic messages
via Telegram using the Plaid API and MySQL database.

## Features

The app offers the following features:

**Plaid API Integration**: Connects to bank accounts using the Plaid API,
obtaining a token for each account. This data is stored in a MySQL database for
easy retrieval.

**Bank Account Information:** Retrieves bank account details such as bank name,
account name, account balance, and individual transactions from the stored Plaid
API data.

**Telegram Integration:** Utilizes the Telegram Bot API to send daily messages.
The app sets up a Telegram group with the bot and the user together, extracting
the Telegram app address for communication with the Telegram API.

**CronJob Automation:** Implements a CronJob to schedule and send automated
messages to the Telegram group every day.

## Stack

The Telegram Bank Text app is built using the following technologies and frameworks:

- React: A JavaScript library for building user interfaces.
- Node.js: A JavaScript runtime for server-side development.
- Express: A web application framework for Node.js.
- MySQL: A popular open-source relational database management system.
- Planet Scale: A platform for deploying and managing databases at scale.
- Daisy UI (Tailwind Library): A Tailwind CSS component library.
- Tailwind CSS: A utility-first CSS framework.
- Plaid API: An API for connecting with bank accounts and retrieving financial data.
- Telegram API: An API for interacting with the Telegram messaging platform.
- Node Cron: A library for scheduling CronJobs in Node.js.

## Instalation

1. Navigate to the client directory:
```
cd client
```
2. Install the required dependencies: 
```
npm install
```
3. Navigate to the server directory:
```
cd client
```
4. Install the required dependencies:
```
npm install
```

## Configuration

1. Create an .env file in the server directory.

2.Copy and paste the following variable names into the .env file:

````
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=
PLAID_PRODUCTS=
PLAID_COUNTRY_CODES=
PLAID_REDIRECT_URI=
DATA_BASE_HOST=
DATA_BASE_USER=
DATA_BASE_PASSWORD=
DATA_BASE_NAME=
```

3. Add your Plaid API credentials and MySQL database credentials to the respective variables in the .env file.
Make sure to complete the installation steps and configuration before running the app.


