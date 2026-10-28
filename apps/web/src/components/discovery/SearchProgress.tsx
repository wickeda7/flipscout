'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';

export function SearchProgress({ retailer, zip }: { retailer: string; zip: string }) {
	const { locale } = useI18n();
	const [started] = useState(() => Date.now());
	const [seconds, setSeconds] = useState(0);
	useEffect(() => {
		const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
		return () => window.clearInterval(timer);
	}, [started]);
	const vi = locale === 'vi';
	return (
		<section
			className='my-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-6'
			aria-label={vi ? 'Tiến trình tìm kiếm' : 'Search progress'}>
			<div className='flex items-center gap-3'>
				<LoaderCircle className='motion-safe:animate-spin text-emerald-300' aria-hidden='true' size={24} />
				<h2 className='font-semibold'>
					{vi ? 'Đang tìm ưu đãi' : 'Finding deals'} · {retailer} · {zip}
				</h2>
			</div>
			<p className='mt-3 text-sm text-neutral-300'>
				{vi
					? 'Đang chờ kết quả. Kết quả đã lưu thường tải nhanh; tìm kiếm mới có thể mất vài phút để lấy và kiểm tra sản phẩm.'
					: 'Waiting for results. Saved results usually load quickly; a fresh search can take several minutes to retrieve and check products.'}
			</p>
			<p className='mt-3 text-sm tabular-nums text-emerald-300' aria-live='off'>
				{vi ? 'Thời gian đã chờ' : 'Time elapsed'}: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
			</p>
			{seconds >= 60 && (
				<p role='status' className='mt-3 text-sm text-amber-200'>
					{vi
						? 'Vẫn đang chờ phản hồi từ máy chủ. Hãy giữ trang này mở; tải lại trang sẽ không làm tìm kiếm nhanh hơn.'
						: 'Still waiting for the server. Keep this page open; reloading will not speed up the search.'}
				</p>
			)}
			<p className='mt-3 text-xs text-neutral-400'>
				{vi
					? 'Máy chủ chưa cung cấp phần trăm hoàn tất. Kết quả sẽ tự động xuất hiện khi có phản hồi.'
					: 'The server does not yet report a completion percentage. Results will appear automatically when the request finishes.'}
			</p>
		</section>
	);
}
