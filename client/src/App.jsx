// @ts-nocheck
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import './App.css';
import BankCard from './components/BankCard';

function App() {
	const [token, setToken] = useState('');
	const [tranReady, setTranReady] = useState(false);
	const [banks, setBanks] = useState([]);
	let link = 'http://localhost:9000/api';

	const generateLinkToken = async () => {
		const response = await fetch(
			'http://localhost:9000/api/create_link_token',
			{
				method: 'POST',
			}
		);
		const data = await response.json();
		setToken(data.link_token);
	};

	const onSuccess = async (/** @type {any} */ token, metadata) => {
		let accessToken = await axios.post(
			'http://localhost:9000/api/set_access_token',
			{
				data: token,
				metadata: metadata,
			}
		);
		console.log(
			'🚀 ~ file: App.jsx:32 ~ onSuccess ~ accessToken:',
			accessToken
		);
	};

	const init = () => {
		// gets all transactions from the last day and all balances for the last 24H
		axios
			.get(`${link}/get/allInformation`)
			.then((res) => console.log(res))
			.catch((error) => console.log(error));
	};

	const getBankNameFromDB = async () => {
		let { data } = await axios.get(`${link}/get/bankInformation`);
		setBanks(data);
	};

	// const getTransactions = async () => {
	// 	const { data } = await axios.post('http://localhost:9000/api/transactions');
	// 	console.log('I am running');

	// 	console.log('🚀 ~ file: App.jsx:39 ~ getTransactions ~ data:', data);
	// };

	// const getBankAccounts = async () => {
	// 	await axios
	// 		.post('http://localhost:9000/api/accounts/get', {
	// 			data: banks[0].access_token,
	// 		})
	// 		.then((data) => console.log(data));
	// };

	// const getInstitutionInfo = async () => {
	// 	await axios
	// 		.post('http://localhost:9000/api/item/get')
	// 		.then((res) => res)
	// 		.catch((e) => console.log(e));
	// };

	let isOauth = false;
	const config = {
		token: token,
		onSuccess,
	};

	const { open, ready } = usePlaidLink(config);
	useEffect(() => {
		generateLinkToken();
		open();
	}, []);

	useEffect(() => {
		getBankNameFromDB();
	}, [banks]);

	return (
		<div className='App'>
			<button
				type='button'
				className='focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800'
				onClick={() => open()}
				disabled={!ready}
			>
				Connect a bank account
			</button>

			<button onClick={init}>INIT</button>

			<BankCard bankName={{ banks }} />
		</div>
	);
}

export default App;
