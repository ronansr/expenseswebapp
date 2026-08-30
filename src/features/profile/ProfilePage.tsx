import {useEffect, useState, type FormEvent} from 'react';
import {Download, LogOut} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {Field} from '../../components/ui/Field';
import {Skeleton} from '../../components/ui/Skeleton';
import {IncomeEditor} from '../income/IncomeEditor';
import {authService, userService} from '../../services';
import {normalizeGanhos} from '../../lib/format';
import {errorMessage} from '../../lib/errors';
import type {ValorResumo} from '../../types';
import {Segmented} from '../../components/ui/Segmented';
import {useTheme} from '../../hooks/useTheme';
import type {PageProps} from '../../app/pageProps';

type Props = PageProps & {onSignOut: () => void};

export const ProfilePage = ({state, ledger, onSignOut}: Props) => {
  const {theme, toggleTheme} = useTheme();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ganhos, setGanhos] = useState<ValorResumo[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    userService
      .getUser()
      .then(user => {
        if (!active) return;
        setName(user?.name || '');
        setEmail(user?.email || '');
        setGanhos(normalizeGanhos(user?.ganhos_mensais));
      })
      .catch(err => active && setError(errorMessage(err, 'Não foi possível carregar o perfil.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFeedback('');
    try {
      /* Mesma regra de antes: salvar o perfil replica os ganhos nos meses futuros. */
      await userService.updateProfile(name, email, ganhos);
      await state.reload();
      setFeedback('Perfil salvo. Os ganhos recorrentes foram aplicados aos meses a partir do atual.');
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar o perfil.'));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['descricao', 'valor', 'dia_entrada'],
      ...ganhos.map(item => [item.descricao, String(item.valor), String(item.dia_entrada || '')]),
    ];
    const blob = new Blob([rows.map(row => row.join(',')).join('\n')], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ganhos_mensais.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="card card-pad enter" style={{display: 'grid', gap: 12}}>
        <Skeleton height={14} width="30%" />
        <Skeleton height={40} />
        <Skeleton height={40} />
      </div>
    );
  }

  return (
    <form className="enter" onSubmit={submit} style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      {error && <p className="banner" role="alert">{error}</p>}
      {feedback && !error && <p className="banner banner-info" role="status">{feedback}</p>}

      <Card>
        <CardHeader
          title="Dados pessoais"
          subtitle="Usados para identificar sua conta no aplicativo."
          actions={<button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>}
        />
        <div className="card-body">
          <div className="form-grid">
            <Field label="Nome">
              <input className="input" required value={name} onChange={event => setName(event.target.value)} />
            </Field>
            <Field label="Email">
              <input className="input" type="email" required value={email} onChange={event => setEmail(event.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Ganhos mensais recorrentes"
          subtitle="Aplicados ao mês atual e aos próximos ao salvar."
        />
        <div className="card-body">
          <IncomeEditor ganhos={ganhos} pessoas={ledger.pessoas} onChange={setGanhos} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Aparência" subtitle="Vale neste navegador." />
        <div className="card-body">
          <Segmented
            ariaLabel="Tema da interface"
            value={theme}
            onChange={next => {
              if (next !== theme) toggleTheme();
            }}
            options={[
              {value: 'light' as const, label: 'Claro'},
              {value: 'dark' as const, label: 'Escuro'},
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Conta" subtitle="Exportação de dados e sessão." />
        <div className="card-body" style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
          <button type="button" className="btn btn-ghost" onClick={exportCsv}>
            <Download size={16} /> Exportar ganhos em CSV
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              await authService.logout();
              onSignOut();
            }}>
            <LogOut size={16} /> Sair da conta
          </button>
        </div>
      </Card>
    </form>
  );
};
