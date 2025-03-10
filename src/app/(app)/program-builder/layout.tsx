import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightIcon } from "lucide-react";


export default function ProgramBuilderLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div>
            <div className="p-2 bg-lightGray flex flex-row items-center justify-between text-xl text-black">
                <Breadcrumb className="w-[33%]">
                    <BreadcrumbList>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/program-builder">Program Builder</BreadcrumbLink>
                        </BreadcrumbItem>
                        {/* <BreadcrumbSeparator />
                        <BreadcrumbItem>
                        <BreadcrumbLink href="/program-builder">Build Program</BreadcrumbLink>
                        </BreadcrumbItem> */}
                        {/* <BreadcrumbSeparator />
                        <BreadcrumbItem>
                        <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                        </BreadcrumbItem> */}
                    </BreadcrumbList>
                </Breadcrumb>
                <Tabs defaultValue="hevy" className="w-[33%] flex items-center justify-center">
                    <TabsList>
                        <TabsTrigger value="hevy">Hevy Routine</TabsTrigger>
                        <TabsTrigger value="proxima">Proxima Program</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="w-[33%] flex items-center justify-end">
                    <Button variant="ghost" className="text-black">Finish<ArrowRightIcon /></Button>
                </div>
            </div>
            {children}
        </div>
    );
}
