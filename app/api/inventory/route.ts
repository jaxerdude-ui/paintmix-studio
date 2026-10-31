import { handleRecords } from "../../../lib/records";
export const dynamic = "force-dynamic";
export const GET = (request:Request) => handleRecords(request,"inventory");
export const POST = (request:Request) => handleRecords(request,"inventory");
export const DELETE = (request:Request) => handleRecords(request,"inventory");
