/* eslint-disable @typescript-eslint/naming-convention */
import type { DetailedHTMLProps, HTMLAttributes } from "react";

type StripePricingTableProps = DetailedHTMLProps<
    HTMLAttributes<HTMLElement> & {
        "pricing-table-id"?: string;
        "publishable-key"?: string;
        "customer-email"?: string;
        "client-reference-id"?: string;
    },
    HTMLElement
>;

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "stripe-pricing-table": StripePricingTableProps;
        }
    }
}

declare module "react/jsx-runtime" {
    namespace JSX {
        interface IntrinsicElements {
            "stripe-pricing-table": StripePricingTableProps;
        }
    }
}
