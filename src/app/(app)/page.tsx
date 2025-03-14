import App from '@/App';
import "../../styles/global.css";

export function generateStaticParams() {
  return [{ slug: [''] }];
}

export default function Page() {
  return  <App />;
}
