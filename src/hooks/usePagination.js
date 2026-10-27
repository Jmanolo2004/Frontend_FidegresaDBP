import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../utils/constants";

/**
 * Guarda la página, el tamaño y los filtros en los query params (?page=2&size=25&q=...)
 * para que la URL se pueda compartir y el botón "atrás" conserve el estado.
 */
export function usePagination(filterDefaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number(searchParams.get("page"));
  const sizeParam = Number(searchParams.get("size"));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam - 1 : 0;
  const size = PAGE_SIZE_OPTIONS.includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE;

  const filtersKey = JSON.stringify(filterDefaults);
  const filters = useMemo(() => {
    const defaults = JSON.parse(filtersKey);
    return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, searchParams.get(key) ?? value]));
  }, [filtersKey, searchParams]);

  const update = useCallback(
    changes => {
      setSearchParams(previous => {
        const next = new URLSearchParams(previous);
        const defaults = JSON.parse(filtersKey);
        for (const [key, value] of Object.entries(changes)) {
          const isDefault = value === "" || value === null || value === undefined || defaults[key] === value || (key === "page" && value === 1) || (key === "size" && value === DEFAULT_PAGE_SIZE);
          if (isDefault) next.delete(key);
          else next.set(key, String(value));
        }
        return next;
      });
    },
    [filtersKey, setSearchParams]
  );

  return {
    page,
    size,
    filters,
    setPage: nextPage => update({ page: nextPage + 1 }),
    setSize: nextSize => update({ size: nextSize, page: 1 }),
    setFilter: (key, value) => update({ [key]: value, page: 1 })
  };
}
