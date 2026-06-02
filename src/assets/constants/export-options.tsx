/* eslint-disable @next/next/no-img-element */
import { hevy_logo, hevy_logo_black, google_sheets_logo_icon } from "public";
import { Crown, Dumbbell, FileText, Table } from "lucide-react";

/** Export destinations available for generated programs. */
export const exportOptions = [
    {
        id: "hevy",
        name: "Hevy",
        icon: (
            <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-lightGold" />
                <img
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    src={(hevy_logo_black as any).src}
                    alt="Hevy"
                    className="h-6 w-auto max-w-[9rem] object-contain object-left dark:hidden"
                />
                <img
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    src={(hevy_logo as any).src}
                    alt="Hevy"
                    className="hidden h-6 w-auto max-w-[9rem] object-contain object-left dark:block"
                />
            </div>
        ),
        subtitle: "Upload your program to Hevy so you can train from the app",
        brand: true,
    },
    {
        id: "volm",
        name: "VOLM",
        icon: (
            <div className="flex items-center gap-2">
                <Dumbbell className="h-6 w-6 shrink-0" />
                <span className="font-third text-base font-semibold">VOLM</span>
            </div>
        ),
        subtitle: "Upload your program to VOLM so you can train from the app",
        brand: true,
        disabled: true,
    },
    {
        id: "pdf",
        name: "PDF",
        icon: <FileText className="w-6 h-6" />,
        subtitle: "Download a printable PDF of your program",
        brand: false,
    },
    // {
    //     id: "macrofactor",
    //     name: "Macrofactor",
    //     icon: (
    //         <img
    //             // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //             src={(macrofactor_logo as any).src}
    //             alt="Macrofactor"
    //             className="w-full h-5 object-contain"
    //         />
    //     ),
    //     subtitle: "Download a .XLSX you can import into Macrofactor Workouts",
    //     brand: true,
    //     disabled: true,
    // },
    {
        id: "google_sheets",
        name: "Google Sheets",
        icon: (
            <img
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                src={(google_sheets_logo_icon as any).src}
                alt="Google Sheets"
                className="w-full h-8 object-contain"
            />
        ),
        subtitle: "Sync your program to a  Google Sheet",
        brand: false,
        disabled: true,
    },
    {
        id: "spreadsheet",
        name: "Spreadsheet",
        icon: <Table className="w-6 h-6" />,
        subtitle: "Download your program as a CSV file",
        brand: false,
    },
];
