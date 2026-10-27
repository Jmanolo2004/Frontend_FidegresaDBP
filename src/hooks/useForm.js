import { useCallback, useState } from "react";
import { runValidators } from "../utils/validators";

/**
 * Manejo de formularios con validación en tiempo real.
 * rules: { campo: [validador, ...] }. Los errores se muestran cuando el campo ya fue tocado.
 */
export function useForm({ initialValues, rules = {}, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback(
    (name, value, allValues) => runValidators(value, rules[name], allValues),
    [rules]
  );

  const validateAll = useCallback(
    currentValues => {
      const nextErrors = {};
      for (const name of Object.keys(rules)) {
        const error = validateField(name, currentValues[name], currentValues);
        if (error) nextErrors[name] = error;
      }
      return nextErrors;
    },
    [rules, validateField]
  );

  const setFieldValue = useCallback(
    (name, value) => {
      const next = { ...values, [name]: value };
      setValues(previous => ({ ...previous, [name]: value }));
      if (touched[name] || errors[name]) {
        setErrors(previous => ({ ...previous, [name]: validateField(name, value, next) }));
      }
    },
    [errors, touched, validateField, values]
  );

  const handleChange = useCallback(
    event => {
      const { name, type, value, checked } = event.target;
      setFieldValue(name, type === "checkbox" ? checked : value);
    },
    [setFieldValue]
  );

  const handleBlur = useCallback(
    event => {
      const { name } = event.target;
      setTouched(previous => ({ ...previous, [name]: true }));
      setErrors(previous => ({ ...previous, [name]: validateField(name, values[name], values) }));
    },
    [validateField, values]
  );

  const handleSubmit = useCallback(
    async event => {
      event?.preventDefault();
      if (isSubmitting) return;
      const nextErrors = validateAll(values);
      setErrors(nextErrors);
      setTouched(Object.fromEntries(Object.keys(rules).map(name => [name, true])));
      if (Object.values(nextErrors).some(Boolean)) {
        const firstInvalid = Object.keys(nextErrors)[0];
        document.querySelector(`[name="${firstInvalid}"]`)?.focus();
        return;
      }
      setIsSubmitting(true);
      try {
        await onSubmit(values, { setErrors });
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, onSubmit, rules, validateAll, values]
  );

  const reset = useCallback((nextValues = initialValues) => {
    setValues(nextValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const getFieldProps = useCallback(
    name => ({
      name,
      value: values[name] ?? "",
      onChange: handleChange,
      onBlur: handleBlur,
      "aria-invalid": errors[name] ? "true" : undefined
    }),
    [errors, handleBlur, handleChange, values]
  );

  return { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit, setFieldValue, setErrors, reset, getFieldProps };
}
