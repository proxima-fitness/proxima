/* eslint-disable react-hooks/incompatible-library */
'use client'

/**
 * @module sign-up-form
 * Registration form: email, password, confirm password, username, first/last name with Yup validation.
 * On submit shows Turnstile then TurnstileSignUp to complete registration.
 * Depends on: TurnstileSignUp, UI components, react-hook-form/yup.
 * Used by: auth sign-up page.
 */
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useState } from 'react';
import * as Yup from "yup";
import { useForm } from 'react-hook-form';
import { yupResolver } from "@hookform/resolvers/yup";
import { TurnstileSignUp } from './TurnstileSignUp';
import { buildAuthLoginHrefFromNext } from '@/lib/sign-in-return';

/** Props: div props plus optional redirectPath preserved for login link (Sign-in return). */
type TSignUpFormProps = React.ComponentPropsWithoutRef<'div'> & {
  redirectPath?: string;
};

export function SignUpForm({ className, redirectPath = '/', ...props }: TSignUpFormProps) {

    const [isLoading, setIsLoading] = useState(false)
    const [turnstileOpen, setTurnstileOpen] = useState(false);

    const schema = Yup.object({
        email: Yup.string()
            .email("Invalid email address")
            .required("Email is required"),
        password: Yup.string()
            .min(6, "Password must be at least 6 characters")
            .matches(/[0-9]/, "Password must contain at least one numeric character e.g. 123")
            .matches(/[a-z]/, "Password must contain at least one lowercase character")
            .matches(/[A-Z]/, "Password must contain at least one uppercase character")
            .matches(/[a-zA-Z]/, "Password must contain at least one alphabetic character e.g. abc")
            .required("Password is required"),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref('password'), ""], "password and confirm password must match")
            .min(6, "Password must be at least 6 characters")
            .matches(/[0-9]/, "Password must contain at least one numeric character e.g. 123")
            .matches(/[a-z]/, "Password must contain at least one lowercase character")
            .matches(/[A-Z]/, "Password must contain at least one uppercase character")
            .matches(/[a-zA-Z]/, "Password must contain at least one alphabetic character e.g. abc")
            .required("Password is required"),
        username: Yup.string()
            .matches(/^[a-z0-9._]+$/, "Username must be lowercase")  // Ensure it's lowercase and may include numbers/underscores
            .min(3, "Username must be at least 3 characters")
            .max(20, "Username must be less than 20 characters")
            .required("Username is required"),
        firstName: Yup.string()
            .min(2, "First name must be at least 2 characters")
            .max(50, "First name must be less than 50 characters")
            .required("First name is required"),
        lastName: Yup.string()
            .max(30, "Last name must be less than 30 characters"),
        });

    type TSignUpFormValues = Yup.InferType<typeof schema>;

    const { register, watch, handleSubmit, formState } = useForm<TSignUpFormValues>({
        mode: "onChange",
        resolver: yupResolver(schema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
            username: "",
            firstName: "",
            lastName: "",
        },
    } );

    const watchEmail = watch("email");
    const watchPassword = watch("password");
    const watchConfirmPassword = watch("confirmPassword");
    const watchUserName = watch("username");
    const watchFirstName = watch("firstName");
    const watchLastName = watch("lastName");

    const { onChange: onEmailChange } = register("email");
    const { onChange: onPasswordChange } = register("password");
    const { onChange: onConfirmPasswordChange } = register("confirmPassword");
    const { onChange: onUserNameChange } = register("username");
    const { onChange: onFirstNameChange } = register("firstName");
    const { onChange: onLastNameChange } = register("lastName");

    const handleSignUp = () => {
        setIsLoading(true);
        setTurnstileOpen(true);
    };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className='bg-lightGray dark:bg-extraDarkGray dark:text-white'>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={ handleSubmit(handleSignUp) }>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">{(formState?.errors?.email?.message && formState?.errors?.email?.message.length > 0)  ? formState.errors.email.message : "Email"}</Label>
                <Input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="lifter@proximafitness.com…"
                    required
                    value={ watchEmail }
                    onInput={ (e) => {
                        onEmailChange({
                            target: {
                            name: "email",
                            value: e?.currentTarget?.value,
                            },
                            type: "email",
                        });
                    } }
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">{(formState?.errors?.password?.message && formState?.errors?.password?.message.length > 0)  ? formState.errors.password.message : "Password"}</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  value={ watchPassword }
                  onInput={ (e) => {
                        onPasswordChange({
                            target: {
                            name: "password",
                            value: e?.currentTarget?.value,
                            },
                            type: "password",
                        });
                    } }
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="confirm-password">{(formState?.errors?.confirmPassword?.message && formState?.errors?.confirmPassword?.message.length > 0)  ? formState.errors.confirmPassword.message : "Confirm Password"}</Label>
                </div>
                <Input
                    id="confirm-password"
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    value={ watchConfirmPassword }
                    onInput={ (e) => {
                        onConfirmPasswordChange({
                            target: {
                            name: "confirmPassword",
                            value: e?.currentTarget?.value,
                            },
                            type: "password",
                        });
                    } }
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="username">{(formState?.errors?.username?.message && formState?.errors?.username?.message.length > 0)  ? formState.errors.username.message : "Username"}</Label>
                </div>
                <Input
                  id="username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  required
                  value={ watchUserName }
                  onInput={ (e) => {
                        onUserNameChange({
                            target: {
                            name: "username",
                            value: e?.currentTarget?.value ? e.currentTarget.value.trim() : "",
                            },
                            type: "text",
                        });
                    } }
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="first-name">{(formState?.errors?.firstName?.message && formState?.errors?.firstName?.message.length > 0)  ? formState.errors.firstName.message : "First Name"}</Label>
                </div>
                <Input
                    id="first-name"
                    type="text"
                    name="firstName"
                    autoComplete="given-name"
                    required
                    value={ watchFirstName }
                    onInput={(e) => {
                        onFirstNameChange({
                            target: {
                            name: "firstName",
                            value: e?.currentTarget?.value ? e.currentTarget.value.trim() : "",
                            },
                            type: "text",
                        });
                    } }
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="last-name">{(formState?.errors?.lastName?.message && formState?.errors?.lastName?.message.length > 0)  ? formState.errors.lastName.message : "Last Name"}</Label>
                </div>
                <Input
                    id="last-name"
                    type="text"
                    name="lastName"
                    autoComplete="family-name"
                    required
                    value={ watchLastName }
                    onInput={ (e) => {
                        onLastNameChange({
                            target: {
                            name: "lastName",
                            value: e?.currentTarget?.value ? e.currentTarget.value.trim() : "",
                            },
                            type: "text",
                        });
                    } }
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-lightSecondary text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Creating an account…' : 'Sign up'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href={buildAuthLoginHrefFromNext(redirectPath)} className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
            { turnstileOpen &&
                <TurnstileSignUp
                    email={ watch().email }
                    password={ watch().password }
                    confirmPassword={ watch().confirmPassword }
                    userName={ watch().username }
                    firstName={ watch().firstName }
                    lastName={ watch().lastName }
                />
            }
        </CardContent>
      </Card>
    </div>
  )
}
