// @ts-nocheck
import axios from 'axios';
import React, { useEffect, useState } from 'react';

function BankCard({ bankName }) {
	return (
		<div className='card bg-base-100 shadow items-center'>
			<div className='card-body w-3/4'>
				<h2 className='card-title justify-center'>Bank Accounts</h2>
				<div className=''>
					{bankName.banks.map((bank, index) => {
						return (
							<span className='badge mr-3' key={index}>
								{bank.bank_name}
							</span>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export default BankCard;
