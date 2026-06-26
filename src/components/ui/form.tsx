/**
 * @module form
 * Form field wiring for react-hook-form: Form (Provider), FormField (Controller),
 * FormItem, FormLabel, FormControl, FormDescription, FormMessage. useFormField
 * connects label/description/message IDs and error state.
 * Depends on: react-hook-form, @radix-ui/react-label, @radix-ui/react-slot, @/lib/utils, label.
 * Used by: app and feature components with validated forms.
 */

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

type TFormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<TFormFieldContextValue>(
  {} as TFormFieldContextValue,
);

/** Wraps Controller and provides field name to useFormField. */
const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
      <FormFieldContext.Provider value={ { name: props.name } }>
          <Controller { ...props } />
      </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type TFormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<TFormItemContextValue>(
  {} as TFormItemContextValue,
);

/** Wraps a single field; provides id for label/description/message linking. */
const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
      <FormItemContext.Provider value={ { id } }>
          <div ref={ ref } className={ cn("space-y-2", className) } { ...props } />
      </FormItemContext.Provider>
  );
});
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return (
      <Label
      ref={ ref }
      className={ cn(error && "text-destructive", className) }
      htmlFor={ formItemId }
      { ...props }
    />
  );
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
      <Slot
      ref={ ref }
      id={ formItemId }
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={ !!error }
      { ...props }
    />
  );
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
      <p
      ref={ ref }
      id={ formDescriptionId }
      className={ cn("text-[0.8rem] text-muted-foreground", className) }
      { ...props }
    />
  );
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : children;

  if (!body) {
    return null;
  }

  return (
      <p
      ref={ ref }
      id={ formMessageId }
      className={ cn("text-[0.8rem] font-medium text-destructive", className) }
      { ...props }
    >
          {body}
      </p>
  );
});
FormMessage.displayName = "FormMessage";

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
