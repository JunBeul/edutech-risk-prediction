import '../../styles/overlayHeader.scss';

type Props = {
	title: string;
	onClose: () => void;
	className?: string;
};

export default function OverlayHeader({ title, onClose, className = '' }: Props) {
	return (
		<div className={`overlay_header ${className}`.trim()}>
			<h3 className='overlay_title'>{title}</h3>
			<button type='button' className='overlay_close_button' onClick={onClose} aria-label='닫기'>
				<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='currentColor'>
					<path d='M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708' />
				</svg>
			</button>
		</div>
	);
}
