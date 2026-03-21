import { FormEvent, useCallback, useState } from "react";

import { Button } from "@web-speed-hackathon-2026/client/src/components/foundation/Button";
import { FormInputField } from "@web-speed-hackathon-2026/client/src/components/foundation/FormInputField";
import { ModalErrorMessage } from "@web-speed-hackathon-2026/client/src/components/modal/ModalErrorMessage";
import { ModalSubmitButton } from "@web-speed-hackathon-2026/client/src/components/modal/ModalSubmitButton";
import { NewDirectMessageFormData } from "@web-speed-hackathon-2026/client/src/direct_message/types";
import { validate } from "@web-speed-hackathon-2026/client/src/direct_message/validation";

interface Props {
  id: string;
  onSubmit: (values: NewDirectMessageFormData) => Promise<void>;
}

export const NewDirectMessageModalPage = ({ id, onSubmit }: Props) => {
  const [values, setValues] = useState<NewDirectMessageFormData>({
    username: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof NewDirectMessageFormData, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const errors = validate(values);
  const hasErrors = Object.keys(errors).length > 0;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setTouched({ username: true });
      const currentErrors = validate(values);
      if (Object.keys(currentErrors).length > 0) {
        return;
      }
      setSubmitting(true);
      setError(undefined);
      try {
        await onSubmit(values);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "_error" in err) {
          setError((err as { _error: string })._error);
        } else if (err instanceof Error) {
          setError(err.message);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [values, onSubmit],
  );

  return (
    <div className="grid gap-y-6">
      <h2 className="text-center text-2xl font-bold">新しくDMを始める</h2>

      <form className="flex flex-col gap-y-6" onSubmit={handleSubmit}>
        <FormInputField
          name="username"
          value={values.username}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.username}
          touched={touched.username}
          label="ユーザー名"
          placeholder="username"
          leftItem={<span className="text-cax-text-subtle leading-none">@</span>}
        />

        <div className="grid gap-y-2">
          <ModalSubmitButton disabled={submitting || hasErrors} loading={submitting}>
            DMを開始
          </ModalSubmitButton>
          <Button variant="secondary" onClick={() => (document.getElementById(id) as HTMLDialogElement | null)?.close()}>
            キャンセル
          </Button>
        </div>

        <ModalErrorMessage>{error}</ModalErrorMessage>
      </form>
    </div>
  );
};
