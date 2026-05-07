import { useAppSelector } from "@/store";

export function useCanEdit() {
  const role = useAppSelector(s => s.app.role);
  return role !== "Viewer";
}
export function useRole() {
  return useAppSelector(s => s.app.role);
}
