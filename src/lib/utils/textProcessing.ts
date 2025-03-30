export function cleanText(text) {
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Remove special characters if needed
    // text = text.replace(/[^\w\s]/gi, '');
    
    return text;
  }
  
  // Function to extract key terms from text
  export function extractKeyTerms(text, maxTerms = 5) {
    // Simple implementation - split by spaces and take the most frequent words
    // A real implementation would use more sophisticated NLP techniques
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = {};
    
    // Count word frequencies
    words.forEach(word => {
      // Skip short words and common stop words
      if (word.length < 4 || ['the', 'and', 'that', 'for', 'with'].includes(word)) {
        return;
      }
      
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Sort by frequency
    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTerms)
      .map(entry => entry[0]);
    
    return sortedWords;
  }
  
  // Function to create a summary of text
  export function createSummary(text, maxLength = 200) {
    // Simple implementation - take the first few sentences
    // A real implementation would use more sophisticated summarization techniques
    if (text.length <= maxLength) {
      return text;
    }
    
    // Find sentence boundaries
    const sentenceRegex = /[.!?]+\s+/g;
    const sentences = [];
    let match;
    let lastIndex = 0;
    
    while ((match = sentenceRegex.exec(text)) && sentences.join('').length < maxLength) {
      sentences.push(text.substring(lastIndex, match.index + match[0].length));
      lastIndex = match.index + match[0].length;
    }
    
    // If no sentences were found or they're too short, just truncate
    if (sentences.length === 0 || sentences.join('').length < maxLength / 2) {
      return text.substring(0, maxLength) + '...';
    }
    
    return sentences.join('');
  }