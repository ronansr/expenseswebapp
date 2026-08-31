import {useMemo, useState} from 'react';
import {Check, Plus, Tags, Trash2} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {Field} from '../../components/ui/Field';
import {MoneyInput} from '../../components/ui/MoneyInput';
import {CategoryAlerts} from './CategoryAlerts';
import {categoryService} from '../../services';
import {activeCategoryAlerts, categoryAlerts, categoryTotals} from '../../lib/selectors';
import {money, parseMoney} from '../../lib/format';
import {errorMessage} from '../../lib/errors';
import {CATEGORY_COLORS} from '../../components/charts/CategoryDonut';
import type {PageProps} from '../../app/pageProps';

export const CategoriesPage = ({dashboard, state}: PageProps) => {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** Teto em edição, por id. Só o que está aberto vira campo. */
  const [limites, setLimites] = useState<Record<string, string>>({});

  const totals = categoryTotals(dashboard);
  const alerts = useMemo(() => categoryAlerts(dashboard), [dashboard]);
  const ativos = useMemo(() => activeCategoryAlerts(alerts), [alerts]);

  const create = async () => {
    const label = name.trim();
    if (!label) return;
    setBusy(true);
    setError('');
    try {
      await categoryService.create(label);
      setName('');
      await state.reload();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível criar a categoria.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await categoryService.remove(id);
      await state.reload();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível remover a categoria.'));
    } finally {
      setBusy(false);
    }
  };

  const salvarLimite = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await categoryService.setLimite(id, parseMoney(limites[id] ?? ''));
      setLimites(current => {
        const proximo = {...current};
        delete proximo[id];
        return proximo;
      });
      await state.reload();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar o teto. Rode a migração 002 no Supabase.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="enter page-stack">
      {error && <p className="banner" role="alert">{error}</p>}

      <CategoryAlerts
        alerts={ativos}
        configurados={alerts.length}
        onManage={() => {
          document.getElementById('lista-categorias')?.scrollIntoView({behavior: 'smooth', block: 'start'});
        }}
      />

      <div className="grid grid-workbench">
        <Card>
          <CardHeader
            title="Categorias"
            subtitle={`${dashboard.categoria_despesas.length} cadastrada(s). O teto vale para as suas despesas, e zero desliga o aviso.`}
          />
          <div className="card-list" id="lista-categorias">
            {dashboard.categoria_despesas.length === 0 ? (
              <EmptyState
                icon={<Tags size={22} />}
                title="Nenhuma categoria"
                description="Crie a primeira categoria no formulário ao lado."
              />
            ) : (
              <div className="rows">
                {dashboard.categoria_despesas.map((category, index) => {
                  const stat = totals.get(category.id) || {count: 0, total: 0};
                  const limite = category.limite_mensal || 0;
                  const editando = limites[category.id] !== undefined;
                  return (
                    <article className="category-row" key={category.id}>
                      <span
                        className="row-icon"
                        style={{background: CATEGORY_COLORS[index % CATEGORY_COLORS.length], color: '#fff'}}
                        aria-hidden="true">
                        <Tags size={15} />
                      </span>

                      <div className="category-main">
                        <div className="category-title-line">
                          <span className="row-title">{category.descricao}</span>
                          <strong className="row-value money">{money(stat.total)}</strong>
                        </div>
                        <span className="row-meta">
                          {stat.count} despesa(s) neste mês
                          {limite > 0 ? (
                            <span className="pill">teto de {money(limite)}</span>
                          ) : (
                            <span className="pill">sem teto</span>
                          )}
                        </span>
                      </div>

                      <div className="category-limit">
                        {editando ? (
                          <>
                            <MoneyInput
                              value={limites[category.id]}
                              onChange={value => setLimites(current => ({...current, [category.id]: value}))}
                            />
                            <button
                              type="button"
                              className="icon-btn"
                              disabled={busy}
                              onClick={() => salvarLimite(category.id)}
                              aria-label={`Salvar teto de ${category.descricao}`}>
                              <Check size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                              setLimites(current => ({
                                ...current,
                                [category.id]: limite > 0 ? money(limite) : '',
                              }))
                            }>
                            {limite > 0 ? 'Mudar teto' : 'Definir teto'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="icon-btn is-danger"
                          disabled={busy}
                          onClick={() => remove(category.id)}
                          aria-label={`Remover ${category.descricao}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <aside className="workbench-side">
          <Card>
            <CardHeader
              title="Nova categoria"
              subtitle="As categorias organizam o gráfico, o filtro e o teto de gasto."
            />
            <div className="card-body">
              <div className="form-stack">
                <Field label="Nome da categoria">
                  <input
                    className="input"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Ex: Saúde"
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        create();
                      }
                    }}
                  />
                </Field>
              </div>
              <div className="form-actions form-actions-stack">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={create}
                  disabled={busy || !name.trim()}>
                  <Plus size={16} /> Criar categoria
                </button>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
};
