import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Avatar } from "../common/Avatar";
import { StatusPill } from "../common/StatusPill";
import { formatDate, timeAgo } from "../../utils/format";

export function CustomerTable({ customers }) {
  return (
    <div className="table-wrap customer-table">
      <table className="data-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contacto</th>
            <th>Local</th>
            <th>Distrito</th>
            <th>Actividad</th>
            <th>Visitas</th>
            <th>Última visita</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(customer => {
            const phoneNumber = String(customer.telefono || "").replace(/\D/g, "");
            return (
              <tr key={customer.id}>
                <td className="customer-cell" data-label="Cliente">
                  <span className="cell-inline">
                    <Avatar name={customer.nombre} initials={customer.iniciales} />
                    <Link className="customer-link" to={`/panel/clientes/${customer.id}`}>
                      {customer.nombre}
                    </Link>
                  </span>
                </td>
                <td className="customer-contact" data-label="Contacto">
                  <span className="cell-stack">
                    {customer.correo ? <a href={`mailto:${customer.correo}`}>{customer.correo}</a> : <span>Sin correo</span>}
                    {phoneNumber ? <a href={`tel:${phoneNumber}`}>{customer.telefono}</a> : <span>Sin teléfono</span>}
                  </span>
                </td>
                <td data-label="Local">{customer.localNombre}</td>
                <td data-label="Distrito">{customer.distrito || "Sin zona"}</td>
                <td data-label="Actividad">
                  <StatusPill variant={customer.estado === "Inactiva" ? "inactive" : "active"}>{customer.estado}</StatusPill>
                </td>
                <td data-label="Visitas">{Number(customer.visitas) || 0}</td>
                <td data-label="Última visita">
                  <span title={formatDate(customer.ultimaVisita)}>{timeAgo(customer.ultimaVisita)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

CustomerTable.propTypes = {
  customers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      nombre: PropTypes.string.isRequired,
      iniciales: PropTypes.string,
      correo: PropTypes.string,
      telefono: PropTypes.string,
      localNombre: PropTypes.string,
      distrito: PropTypes.string,
      estado: PropTypes.string,
      visitas: PropTypes.number,
      ultimaVisita: PropTypes.string
    })
  ).isRequired
};
