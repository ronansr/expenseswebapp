import {useState} from 'react';
import {Plus, Tags, Trash2} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {Field} from '../../components/ui/Field';
import {categoryService} from '../../services';
import {categoryTotals} from '../../lib/selectors';
import {money} from '../../lib/format';
import {errorMessage} from '../../lib/errors';
import {CATEGORY_COLORS} from '../../components/charts/CategoryDonut';
import type {PageProps} from '../../app/pageProps';

export const CategoriesPage = ({dashboard, state}: PageProps) => {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const totals = categoryTotals(dashboard);

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

  return (
    <div className="enter" style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      {error && <p className="banner" role="alert">{error}</p>}

      <Card>
        <CardHeader title="Nova categoria" subtitle="As categorias organizam o gráfico e o filtro de despesas." />
        <div className="card-body">
          <Field label="Nome da categoria">
            <span style={{display: 'flex', gap: 12}}>
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
              <button type="button" className="btn btn-primary" onClick={create} disabled={busy || !name.trim()}>
                <Plus size={16} /> Criar
              </button>
            </span>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Categorias" subtitle={`${dashboard.categoria_despesas.length} cadastrada(s)`} />
        <div style={{marginTop: 12}}>
          {dashboard.categoria_despesas.length === 0 ? (
            <EmptyState icon={<Tags size={22} />} title="Nenhuma categoria" description="Crie a primeira categoria acima." />
          ) : (
            <div className="rows">
              {dashboard.categoria_despesas.map((category, index) => {
                const stat = totals.get(category.id) || {count: 0, total: 0};
                return (
                  <div className="row-item" key={category.id}>
                    <span
                      className="row-icon"
                      style={{background: CATEGORY_COLORS[index % CATEGORY_COLORS.length], color: '#fff'}}
                      aria-hidden="true">
                      <Tags size={15} />
                    </span>
                    <div className="row-main">
                      <span className="row-title">{category.descricao}</span>
                      <span className="row-meta">{stat.count} despesa(s) neste mês</span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <strong className="row-value">{money(stat.total)}</strong>
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        disabled={busy}
                        onClick={() => remove(category.id)}
                        aria-label={`Remover ${category.descricao}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
