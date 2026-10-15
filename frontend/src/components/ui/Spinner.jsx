import { FaSpinner } from 'react-icons/fa';

/**
 * Standalone loading spinner. Button ke andar ho to <Spinner />, bare
 * loading panel mein size className se control karo.
 */
export default function Spinner({ className = 'w-5 h-5' }) {
  return <FaSpinner className={`${className} animate-spin`} aria-hidden="true" />;
}
