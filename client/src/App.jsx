// @ts-nocheck
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import './App.css';

function App() {
	const [token, setToken] = useState('');
	const [tranReady, setTranReady] = useState(false);
	const [banks, setBanks] = useState([]);

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

	const onSuccess = async (/** @type {any} */ token) => {
		await axios
			.post('http://localhost:9000/api/set_access_token', {
				data: token,
			})
			.then((res) => {
				console.log('🚀 ~ file: App.jsx:29 ~ .then ~ res:', res);
				setBanks((prev) => {
					return [...prev, res.data];
				});
			});
	};

	const getTransactions = async () => {
		const data = await axios.post('http://localhost:9000/api/transactions');
		console.log('🚀 ~ file: App.jsx:28 ~ getTransactions ~ data:', data);
		console.table(data?.latest_transactions);
	};
	const getBankAccounts = async () => {
		await axios
			.post('http://localhost:9000/api/accounts/get', {
				data: banks[0].access_token,
			})
			.then((data) => console.log(data));
	};

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

	return (
		<div className='App'>
			<button onClick={() => open()} disabled={!ready}>
				Connect a bank account
			</button>
			<button onClick={() => getTransactions()}>Get my transactions</button>
			<button onClick={() => getBankAccounts()}>Get my account info</button>
		</div>
	);
}

export default App;
