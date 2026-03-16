export const renderQuestionType = (type: string): string | null => {
    switch (type) {
        case 'TrueFalse':
            return 'true/false'
    
        default:
            return null
    }
}