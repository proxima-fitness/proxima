import { Button } from "@/components/ui/button";

export const metadata = {
    title: "Delete Account | Proxima Fitness",
    description: "Get in touch with us",
  };

  export default function DeleteAccount() {
    return (
        <div className='h-[900px] bg-white flex flex-col items-center justify-center'>
            <Button>Delete Account</Button>
        </div>
    );
}
