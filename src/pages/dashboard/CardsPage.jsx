import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { KpiCard } from "../../components/common/KpiCard";
import { PanelHeading } from "../../components/common/PanelHeading";
import { FilterSelect } from "../../components/common/FilterSelect";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Icon } from "../../components/common/Icon";
import { KpiSkeletonGrid, Skeleton } from "../../components/common/Skeleton";
import { LoyaltyCard } from "../../components/cards/LoyaltyCard";
import { CardDesignerDialog } from "../../components/cards/CardDesignerDialog";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { loyaltyProgramService } from "../../services/loyaltyProgramService";
import { branchService } from "../../services/branchService";
import { CARD_TYPES, CARD_TYPE_ICONS } from "../../utils/constants";

const TYPE_OPTIONS = [{ value: "Todas", label: "Todas" }, ...CARD_TYPES.map(type => ({ value: type, label: type === "Giftcard" ? "Gift cards" : type }))];

export default function CardsPage() {
  useDocumentTitle("Tarjetas");
  const { showToast, showError } = useToast();
  const [typeFilter, setTypeFilter] = useState("Todas");
  const [designer, setDesigner] = useState({ open: false, card: null });
  const [cardToDelete, setCardToDelete] = useState(null);

  const programs = useFetch(({ signal }) => loyaltyProgramService.getAll({}, { signal }), []);
  const locations = useFetch(({ signal }) => branchService.getAll({ signal }), []);

  const allCards = programs.data || [];
  const cards = allCards.filter(card => typeFilter === "Todas" || card.tipo === typeFilter);
  const countOf = type => allCards.filter(card => card.tipo === type).length;

  const handleSaved = () => {
    setDesigner({ open: false, card: null });
    programs.refresh();
  };

  const deleteCard = async () => {
    try {
      await loyaltyProgramService.remove(cardToDelete.id);
      programs.setData(current => current.filter(card => card.id !== cardToDelete.id));
      showToast(`Tarjeta “${cardToDelete.nombre}” eliminada.`);
      setCardToDelete(null);
    } catch (error) {
      showError(error.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Tarjetas"
        summary="Diseña las tarjetas digitales que reemplazan a las tarjetas físicas de sellos de tu negocio."
        actions={
          <button type="button" className="primary-button" onClick={() => setDesigner({ open: true, card: null })} disabled={!locations.data?.length}>
            <Icon name="card" size={16} />
            Crear programa
          </button>
        }
      />

      {programs.data ? (
        <div className="stats-grid card-program-stats">
          <KpiCard label="Programas creados" value={allCards.length} explanation="Tarjetas de lealtad listas para tus clientes." icon="card" />
          <KpiCard label="Estampillas" value={countOf("Estampillas")} explanation="Premia visitas y compras frecuentes." icon="star" />
          <KpiCard label="Cashback" value={countOf("Cashback")} explanation="Devuelve un porcentaje de cada compra." icon="reward" />
          <KpiCard label="Niveles y gift cards" value={countOf("Niveles") + countOf("Giftcard")} explanation="Reconoce progreso y ofrece saldo de regalo." icon="users" />
        </div>
      ) : (
        !programs.error && <KpiSkeletonGrid />
      )}

      <section className="card-builder-intro">
        <div>
          <span className="card-builder-kicker">DISEÑADOR DE PROGRAMAS</span>
          <h2>Una experiencia que lleva tu marca.</h2>
          <p>Adiós a las tarjetas de cartón que se pierden: personaliza beneficios, colores e imagen, y tus clientes llevarán su progreso en el celular.</p>
        </div>
        <div className="card-type-chips">
          {CARD_TYPES.map(type => (
            <span key={type}>
              <Icon name={CARD_TYPE_ICONS[type]} size={14} />
              {type === "Giftcard" ? "Gift card" : type}
            </span>
          ))}
        </div>
      </section>

      <article className="panel card-program-panel">
        <PanelHeading title="Tus programas" subtitle="Diseña, edita o elimina tarjetas de lealtad">
          <FilterSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} label="Filtrar programas" />
        </PanelHeading>
        {programs.error && !programs.data ? (
          <ErrorState error={programs.error} onRetry={programs.reload} compact />
        ) : !programs.data ? (
          <div className="cards-grid">
            {[0, 1, 2].map(index => (
              <Skeleton key={index} height={230} radius={16} />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <EmptyState message="No hay programas en esta categoría. Crea uno para comenzar." actionLabel="Crear programa" onAction={() => setDesigner({ open: true, card: null })} />
        ) : (
          <div className="cards-grid">
            {cards.map(card => (
              <article className="program-card" key={card.id}>
                <LoyaltyCard card={card} />
                <div className="program-card-meta">
                  <span className={`program-status${card.activa ? "" : " paused"}`}>
                    <i />
                    {card.activa ? "Activa" : "En pausa"}
                  </span>
                  <span>{card.clientes} clientes</span>
                  <span>{card.negocio}</span>
                </div>
                <div className="program-card-actions">
                  <button type="button" className="small-action" onClick={() => setDesigner({ open: true, card })}>
                    <Icon name="settings" size={14} />
                    Diseñar
                  </button>
                  <button type="button" className="small-action danger-text" onClick={() => setCardToDelete(card)}>
                    <Icon name="close" size={14} />
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <CardDesignerDialog open={designer.open && Boolean(locations.data)} card={designer.card} locations={locations.data || []} onClose={() => setDesigner({ open: false, card: null })} onSaved={handleSaved} />
      <ConfirmDialog
        open={Boolean(cardToDelete)}
        title="Eliminar tarjeta"
        description={cardToDelete ? `¿Quieres eliminar “${cardToDelete.nombre}”? Los clientes ya no verán este programa.` : ""}
        confirmLabel="Eliminar"
        onConfirm={deleteCard}
        onClose={() => setCardToDelete(null)}
      />
    </>
  );
}
