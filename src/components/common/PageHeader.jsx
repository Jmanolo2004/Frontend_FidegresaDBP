import PropTypes from "prop-types";

export function PageHeader({ title, summary, actions }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {summary && <p>{summary}</p>}
      </div>
      {actions}
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  summary: PropTypes.node,
  actions: PropTypes.node
};
