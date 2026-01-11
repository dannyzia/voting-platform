import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-8xl font-display font-bold text-primary-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-slate-400 mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
