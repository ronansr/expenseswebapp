import {useMemo, useState} from 'react';
import {ArrowDownLeft, HandCoins, Plus, Trash2, UserRound, Users} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {Field} from '../../components/ui/Field';
import {RowsSkeleton} from '../../components/ui/Skeleton';
import {KpiCard} from '../overview/KpiCard';
import {pessoaService} from '../../services';
import {peopleLedger, splitExpenses} from '../../lib/selectors';
import {money, shortDate} from '../../lib/format';
import {errorMessage} from '../../lib/errors';
import {usePeopleHistory} from './usePeopleHistory';
import type {PageProps} from '../../app/pageProps';

export const PeoplePage = ({state, ledger, overview}: PageProps) => {
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [aberta, setAberta] = useState<string | null>(null);

  const history = usePeopleHistory(version);
  const extratos = useMemo(
    () => peopleLedger(ledger.pessoas, history.despesas, history.ganhos),
    [ledger.pessoas, history.despesas, history.ganhos],
  );
  const totalAReceber = extratos.reduce((acc, item) => acc + item.aReceber, 0);
  const doMes = splitExpenses(state.expenses).terceiros;

  const criar = async () => {
    const label = nome.trim();
    if (!label) return;
    setBusy(true);
    setError('');
    try {
      await pessoaService.create(label);
      setNome('');
      await ledger.reload();
      setVersion(current => current + 1);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível cadastrar a pessoa.'));
    } finally {
      setBusy(false);
    }
  };

  const remover = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await pessoaService.remove(id);
      await ledger.reload();
      await state.reload();
      setVersion(current => current + 1);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível remover a pessoa.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="enter" style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      {error && <p className="banner" role="alert">{error}</p>}
      {history.error && <p className="banner" role="alert">{history.error}</p>}

      <div className="grid grid-kpi">
        <KpiCard
          label="Gastos de terceiros neste mês"
          value={overview.terceiros.total}
          footnote={`${doMes.length} lançamento(s) que não são seus`}
          icon={Users}
          tone="info"
        />
        <KpiCard
          label="Devoluções recebidas no mês"
          value={overview.reembolsos}
          footnote="Entradas marcadas com o nome de uma pessoa"
          icon={ArrowDownLeft}
          tone="good"
        />
        <KpiCard
          label="A receber, somando todos os meses"
          value={totalAReceber}
          footnote="O que ainda não voltou para você"
          icon={HandCoins}
          tone={totalAReceber > 0 ? 'warn' : 'good'}
        />
      </div>

      <Card>
        <CardHeader title="Cadastrar pessoa" subtitle="Use o nome que você reconhece na hora de lançar a despesa." />
        <div className="card-body">
          <Field label="Nome">
            <span style={{display: 'flex', gap: 12}}>
              <input
                className="input"
                value={nome}
                onChange={event => setNome(event.target.value)}
                placeholder="Ex: Marina"
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    criar();
                  }
                }}
              />
              <button type="button" className="btn btn-primary" onClick={criar} disabled={busy || !nome.trim()}>
                <Plus size={16} /> Cadastrar
              </button>
            </span>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Quem usa o seu dinheiro"
          subtitle="Some tudo o que você pagou por cada pessoa e desconte o que ela já devolveu."
        />
        <div style={{marginTop: 12}}>
          {history.loading ? (
            <RowsSkeleton rows={3} />
          ) : extratos.length === 0 ? (
            <EmptyState
              icon={<Users size={22} />}
              title="Ninguém cadastrado ainda"
              description="Cadastre quem usa o seu cartão. Ao lançar a despesa, escolha a pessoa e ela sai dos seus totais."
            />
          ) : (
            <div className="rows">
              {extratos.map(extrato => (
                <div key={extrato.pessoa.id}>
                  <div className="row-item">
                    <span className="row-icon" aria-hidden="true"><UserRound size={16} /></span>
                    <div className="row-main">
                      <span className="row-title">{extrato.pessoa.nome}</span>
                      <span className="row-meta">
                        {money(extrato.lancado)} lançados, {money(extrato.reembolsado)} devolvidos
                        {extrato.despesas.length > 0 && (
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setAberta(current => (current === extrato.pessoa.id ? null : extrato.pessoa.id))}>
                            {aberta === extrato.pessoa.id ? 'Ocultar lançamentos' : `Ver ${extrato.despesas.length} lançamento(s)`}
                          </button>
                        )}
                      </span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <strong className={`row-value ${extrato.aReceber > 0 ? 'text-warn' : 'text-good'}`}>
                        {money(extrato.aReceber)}
                      </strong>
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        disabled={busy}
                        onClick={() => remover(extrato.pessoa.id)}
                        aria-label={`Remover ${extrato.pessoa.nome}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {aberta === extrato.pessoa.id &&
                    extrato.despesas.map(despesa => (
                      <div className="row-item" key={despesa.id} style={{paddingLeft: 62}}>
                        <span />
                        <div className="row-main">
                          <span className="row-title">{despesa.descricao}</span>
                          <span className="row-meta">
                            {shortDate(despesa.vencimento)}
                            {despesa.totalParcelas > 1 && (
                              <span className="pill pill-info">{despesa.parcela}/{despesa.totalParcelas}</span>
                            )}
                          </span>
                        </div>
                        <strong className="row-value">{money(despesa.valor)}</strong>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card-foot">
          <span className="text-muted" style={{fontSize: 12.5}}>
            Para registrar uma devolução, cadastre a entrada em Receitas e marque a pessoa como origem.
          </span>
        </div>
      </Card>
    </div>
  );
};
