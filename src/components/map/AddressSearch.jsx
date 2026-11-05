import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDebounce } from "../../hooks/useDebounce";
import { FormField } from "../common/FormField";

const GEOCODER_URL = import.meta.env.VITE_GEOCODER_URL || "https://photon.komoot.io/api";
const LIMA_BBOX = "-77.25,-12.35,-76.75,-11.75";

export function AddressSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const debouncedQuery = useDebounce(query, 400);
  const lastRequestAt = useRef(0);

  useEffect(() => {
    const search = debouncedQuery.trim();
    if (search.length < 3) {
      setResults([]);
      setError("");
      return undefined;
    }
    const controller = new AbortController();
    const delay = Math.max(0, 1000 - (Date.now() - lastRequestAt.current));
    const timer = setTimeout(async () => {
      try {
        lastRequestAt.current = Date.now();
        const url = new URL(GEOCODER_URL);
        url.searchParams.set("q", search);
        url.searchParams.set("bbox", LIMA_BBOX);
        url.searchParams.set("limit", "5");
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("No pudimos buscar esa dirección.");
        const data = await response.json();
        setResults((data.features || []).filter(feature => {
          const [lng, lat] = feature.geometry.coordinates;
          return lng >= -77.25 && lng <= -76.75 && lat >= -12.35 && lat <= -11.75;
        }));
        setError("");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setResults([]);
          setError(requestError.message || "No pudimos buscar esa dirección.");
        }
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [debouncedQuery]);

  const choose = result => {
    const [lng, lat] = result.geometry.coordinates;
    const address = result.properties.name || result.properties.street || result.properties.city || "Dirección seleccionada";
    onSelect({ lat: Number(lat), lng: Number(lng), address });
    setQuery(address);
    setResults([]);
  };

  return (
    <FormField label="Buscar dirección en Lima">
      <div className="address-search">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ej. Av. Larco 812" aria-label="Buscar dirección en Lima" aria-controls="address-search-results" aria-expanded={results.length > 0} />
        {error && <small className="field-error" role="status">{error}</small>}
        {results.length > 0 && (
          <ul id="address-search-results" role="listbox" className="address-search-results">
            {results.map((result, index) => (
              <li key={`${result.properties.osm_id || index}`} role="option" aria-selected="false">
                <button type="button" onClick={() => choose(result)}>{result.properties.name || result.properties.street || "Dirección"} · {result.properties.city || result.properties.district || "Lima"}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormField>
  );
}

AddressSearch.propTypes = { onSelect: PropTypes.func.isRequired };
