type EmptyStateProps = {
	userName: string;
};

export function EmptyState(props: EmptyStateProps) {
	return (
		<div className="flex items-center justify-center h-full">
			<h1 className="text-4xl font-light text-foreground font-serif">
				Hi there, <span className="text-primary">{props.userName}</span>!
			</h1>
		</div>
	);
}
