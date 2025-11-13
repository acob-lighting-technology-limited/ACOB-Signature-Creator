/**
 * Date validation utilities
 * Prevents database issues caused by invalid date ranges
 */
export const dateValidation = {
  /**
   * Check if end date is before start date
   */
  isEndBeforeStart: (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate) return false
    return new Date(endDate) < new Date(startDate)
  },

  /**
   * Validate date range and return error message if invalid
   * @returns Error message if invalid, null if valid
   */
  validateDateRange: (startDate: string, endDate: string, fieldName = "date"): string | null => {
    if (!startDate || !endDate) return null
    if (dateValidation.isEndBeforeStart(startDate, endDate)) {
      return `End ${fieldName} cannot be before start ${fieldName}`
    }
    return null
  },
}

/**
 * Asset assignment validation utilities
 * Prevents assignment type mismatches that corrupt database
 */
export const assignmentValidation = {
  /**
   * Validate that assignment has required fields based on type
   * @returns Error message if invalid, null if valid
   */
  validateAssignment: (
    assignmentType: "individual" | "department" | "office",
    assignedTo?: string,
    department?: string,
    officeLocation?: string
  ): string | null => {
    if (assignmentType === "individual" && !assignedTo) {
      return "Please select a person to assign to"
    }
    if (assignmentType === "department" && !department) {
      return "Please select a department"
    }
    if (assignmentType === "office" && !officeLocation) {
      return "Please select an office location"
    }
    return null
  },
}

/**
 * Form validation utilities
 */
export const formValidation = {
  /**
   * Check if all required fields are filled
   */
  hasRequiredFields: (fields: Record<string, any>, requiredKeys: string[]): boolean => {
    return requiredKeys.every((key) => {
      const value = fields[key]
      return value !== null && value !== undefined && value !== ""
    })
  },

  /**
   * Get missing required field names
   */
  getMissingFields: (fields: Record<string, any>, requiredKeys: string[]): string[] => {
    return requiredKeys.filter((key) => {
      const value = fields[key]
      return value === null || value === undefined || value === ""
    })
  },
}

