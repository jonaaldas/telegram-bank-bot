// @ts-nocheck
import axios from 'axios';
import React, { useEffect, useState } from 'react';

function BankCard({ bankName }) {
	return (
		<div className='max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700'>
			<h1 className='mb-4 text-2xl font-extrabold leading-none tracking-tight text-gray-900 md:text-2xl lg:text-3xl dark:text-white'>
				We invest in the world’s potential
			</h1>
			{bankName.banks.map((bank, index) => {
				return (
					<span
						className='bg-gray-100 text-gray-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300'
						key={index}
					>
						{bank.bank_name}
					</span>
				);
			})}
		</div>
	);
}

export default BankCard;
