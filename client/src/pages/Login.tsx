import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Delete } from 'lucide-react';
import { login } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const append = (digit: string) => {
    if (pin.length < 8) setPin((p) => p + digit);
  };
  const backspace = () => setPin((p) => p.slice(0, -1));

  const submit = async () => {
    if (!pin) return;
    setLoading(true);
    setError('');
    try {
      const { token } = await login(pin);
      setToken(token);
      navigate('/', { replace: true });
    } catch {
      setError('Incorrect PIN. Try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const dots = Array.from({ length: 6 }).map((_, i) => (
    <div
      key={i}
      className={`h-3.5 w-3.5 rounded-full border-2 transition-all ${i < pin.length ? 'bg-primary border-primary' : 'border-gray-300'}`}
    />
  ));

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-6">
      <div className="w-full max-w-xs">
        <div className="text-center mb-10">
          <div className="text-4xl font-bold text-primary mb-1">RealTaylor</div>
          <div className="text-muted-foreground text-sm">REPS Hours & Mileage Tracker</div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <p className="text-center text-sm font-medium text-gray-500 mb-5">Enter your PIN</p>

          <div className="flex justify-center gap-3 mb-6">
            {dots}
          </div>

          {error && (
            <p className="text-center text-sm text-destructive mb-4">{error}</p>
          )}

          <div className="grid grid-cols-3 gap-3">
            {keys.map((key, i) => {
              if (key === '') return <div key={i} />;
              if (key === '⌫') return (
                <button
                  key={i}
                  onClick={backspace}
                  className="h-14 rounded-xl bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors"
                >
                  <Delete className="h-5 w-5 text-gray-600" />
                </button>
              );
              return (
                <button
                  key={i}
                  onClick={() => append(key)}
                  className="h-14 rounded-xl bg-gray-50 border border-gray-100 text-xl font-semibold active:bg-gray-200 transition-colors"
                >
                  {key}
                </button>
              );
            })}
          </div>

          <Button
            onClick={submit}
            disabled={pin.length < 1 || loading}
            className="w-full mt-4 h-12 text-base"
          >
            {loading ? 'Checking...' : 'Unlock'}
          </Button>
        </div>
      </div>
    </div>
  );
}
