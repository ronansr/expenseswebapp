import {useState, type FormEvent} from 'react';
import {ArrowLeft, CalendarClock, ShieldCheck, Users, Wallet} from 'lucide-react';
import {Field} from '../../components/ui/Field';
import {authService} from '../../services';
import {errorMessage} from '../../lib/errors';

type Mode = 'login' | 'register' | 'reset';

const COPY: Record<Mode, {title: string; subtitle: string; submit: string}> = {
  login: {title: 'Entrar', subtitle: 'Acesse o painel do mês e continue de onde parou.', submit: 'Entrar'},
  register: {title: 'Criar conta', subtitle: 'Leva menos de um minuto para começar a organizar o mês.', submit: 'Criar conta'},
  reset: {title: 'Recuperar senha', subtitle: 'Enviamos um link de redefinição para o seu email.', submit: 'Enviar link'},
};

type Props = {
  initialMode?: Mode;
  onAuthenticated: () => void;
  onBack: () => void;
};

export const AuthScreen = ({initialMode = 'login', onAuthenticated, onBack}: Props) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const copy = COPY[mode];

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setMessage('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'login') {
        await authService.login(email, password);
        onAuthenticated();
        return;
      }
      if (mode === 'register') {
        await authService.register(email, password, name);
        switchMode('login');
        setMessage('Conta criada. Confirme o email se for solicitado e entre em seguida.');
      }
      if (mode === 'reset') {
        await authService.resetPassword(email);
        switchMode('login');
        setMessage('Link de redefinição enviado para o seu email.');
      }
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível concluir.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth">
      <section className="auth-aside">
        <div className="brand">
          <span className="brand-mark" style={{background: 'rgba(255,255,255,.16)', color: '#fff'}} aria-hidden="true">
            <Wallet size={19} />
          </span>
          <span className="brand-name" style={{color: '#fff'}}>SobControle</span>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          <h2>O mês inteiro em uma tela, antes de virar surpresa.</h2>
          <div className="auth-points">
            <div className="auth-point">
              <CalendarClock size={18} />
              <span>
                <strong>Saldo projetado dia a dia</strong>
                <span>Entradas e vencimentos somados na ordem em que acontecem.</span>
              </span>
            </div>
            <div className="auth-point">
              <Users size={18} />
              <span>
                <strong>O que é seu e o que é dos outros</strong>
                <span>Gasto de terceiro sai dos seus totais e vira crédito a receber.</span>
              </span>
            </div>
            <div className="auth-point">
              <ShieldCheck size={18} />
              <span>
                <strong>Seus dados, sua conta</strong>
                <span>Autenticação e armazenamento no seu próprio projeto Supabase.</span>
              </span>
            </div>
          </div>
        </div>

        <p style={{fontSize: 12.5}}>Feito para quem controla o próprio orçamento.</p>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <button type="button" className="link-btn" onClick={onBack} style={{alignSelf: 'flex-start'}}>
            <ArrowLeft size={14} style={{verticalAlign: -2}} /> Voltar
          </button>

          <header>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </header>

          {error && <p className="banner" role="alert">{error}</p>}
          {message && !error && <p className="banner banner-info" role="status">{message}</p>}

          {mode === 'register' && (
            <Field label="Nome">
              <input className="input" value={name} onChange={event => setName(event.target.value)} placeholder="Como você quer ser chamado" />
            </Field>
          )}

          <Field label="Email">
            <input
              className="input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="você@email.com"
            />
          </Field>

          {mode !== 'reset' && (
            <Field label="Senha" hint={mode === 'register' ? 'Mínimo de 6 caracteres.' : undefined}>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
              />
            </Field>
          )}

          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Aguarde...' : copy.submit}
          </button>

          <div className="auth-links">
            <button type="button" className="link-btn" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Criar uma conta' : 'Já tenho conta'}
            </button>
            {mode !== 'reset' && (
              <button type="button" className="link-btn" onClick={() => switchMode('reset')}>
                Esqueci a senha
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
};
