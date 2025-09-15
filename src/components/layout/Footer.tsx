export const Footer = () => {
  return (
    <footer className="w-full border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="text-center text-sm text-muted-foreground">
          <div>PPP-Program :: System Checklist by Sebastian Popiel</div>
          <div className="mt-1">
            <a 
              href="https://www.PPP-PROGRAM.pl" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              www.PPP-PROGRAM.pl
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};