import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <p className="text-8xl font-bold text-gray-200 dark:text-gray-800">404</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-4">Page not found</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">Go to Dashboard</Link>
      </div>
    </div>
  );
}
