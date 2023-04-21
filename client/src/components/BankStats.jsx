import React from 'react';

export default function BankStats() {
	return (
		<div className='stats shadow w-full'>
			<div className='stat place-items-center'>
				<div className='stat-title'>Total Cash</div>
				<div className='stat-value'>31K</div>
			</div>

			<div className='stat place-items-center'>
				<div className='stat-title'>Debt</div>
				<div className='stat-value text-secondary'>4,200</div>
			</div>
		</div>
	);
}
