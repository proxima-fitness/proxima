/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestDnd } from "@/components/generic/TestDnd";

export const metadata = {
    title: "Contact Us | Proxima Fitness",
    description: "Get in touch with us",
  };

  export default function ContactPage() {
    return (
        <div className='h-[900px] bg-white flex flex-col items-center justify-center'>
            <TestDnd />

        </div>
    );
}
