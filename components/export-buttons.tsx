import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, FileText } from "lucide-react"

interface ExportButtonsProps {
  onExportExcel: () => void
  onExportPDF: () => void
  onExportWord: () => void
  disabled?: boolean
  label?: string
}

export function ExportButtons({
  onExportExcel,
  onExportPDF,
  onExportWord,
  disabled = false,
  label = "Export Filtered Data:",
}: ExportButtonsProps) {
  return (
    <Card className="border-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExportExcel} className="gap-2" disabled={disabled}>
              <FileText className="h-4 w-4" />
              Excel (.xlsx)
            </Button>
            <Button variant="outline" size="sm" onClick={onExportPDF} className="gap-2" disabled={disabled}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onExportWord} className="gap-2" disabled={disabled}>
              <FileText className="h-4 w-4" />
              Word (.docx)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

