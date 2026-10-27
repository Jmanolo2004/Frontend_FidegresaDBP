import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import { BrandLink } from "../common/BrandLink";

export function LegalLayout({ kicker, title, lead, note, sections }) {
  const navigate = useNavigate();
  return (
    <main className="legal-screen">
      <header className="legal-header">
        <BrandLink />
        <button type="button" className="legal-back" onClick={() => navigate("/")}>
          Volver a Fidegresa
        </button>
      </header>
      <article className="legal-document">
        <Link className="legal-return" to="/">
          ← Volver al sitio
        </Link>
        <span className="marketing-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p className="legal-lead">{lead}</p>
        {note && <p className="legal-demo-note">{note}</p>}
        {sections.map(section => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </article>
      <footer className="legal-footer">© {new Date().getFullYear()} Fidegresa</footer>
    </main>
  );
}

LegalLayout.propTypes = {
  kicker: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  lead: PropTypes.string.isRequired,
  note: PropTypes.string,
  sections: PropTypes.arrayOf(PropTypes.shape({ title: PropTypes.string.isRequired, body: PropTypes.node.isRequired })).isRequired
};
