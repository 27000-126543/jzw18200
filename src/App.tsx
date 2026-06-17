import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Fields from '@/pages/Fields';
import Seasons from '@/pages/Seasons';
import Operations from '@/pages/Operations';
import Reminders from '@/pages/Reminders';
import Harvest from '@/pages/Harvest';
import Finance from '@/pages/Finance';
import Reports from '@/pages/Reports';
import Weather from '@/pages/Weather';

function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-8xl mb-6">🌾</div>
      <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-farm-primary to-farm-accent bg-clip-text text-transparent mb-3">
        404
      </h1>
      <h2 className="text-xl md:text-2xl font-semibold text-farm-primary-dark mb-2">
        页面走丢啦
      </h2>
      <p className="text-gray-500 mb-8 max-w-md">
        您访问的页面不存在或已被移除，请检查链接是否正确，或返回首页继续浏览。
      </p>
      <button
        onClick={() => window.location.hash = '#/'}
        className="btn-primary"
      >
        返回首页
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fields" element={<Fields />} />
          <Route path="/seasons" element={<Seasons />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/harvest" element={<Harvest />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Router>
  );
}
