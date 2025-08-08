"""
Structured Response Formatter for RAG Pipeline
==============================================

Advanced response formatting service that converts RAG outputs into 
structured, consistent formats suitable for different use cases and
client applications.

Features:
- Multiple output formats (JSON, Markdown, HTML, Plain Text)
- Source attribution and citation management
- Confidence scoring and quality indicators
- Response validation and post-processing
- Template-based formatting system

Author: Engunity AI Team
"""

import json
import re
import html
import logging
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import markdown
from pathlib import Path

logger = logging.getLogger(__name__)

class ResponseFormat(str, Enum):
    """Supported response formats."""
    JSON = "json"
    MARKDOWN = "markdown"
    HTML = "html"
    PLAIN_TEXT = "plain_text"
    STRUCTURED_JSON = "structured_json"
    CITATION_FORMAT = "citation_format"

class ConfidenceLevel(str, Enum):
    """Confidence level categories."""
    HIGH = "high"          # > 0.8
    MEDIUM = "medium"      # 0.5 - 0.8
    LOW = "low"           # 0.3 - 0.5
    VERY_LOW = "very_low" # < 0.3

@dataclass
class FormattedResponse:
    """Formatted response structure."""
    content: str
    format_type: ResponseFormat
    metadata: Dict[str, Any]
    sources: List[Dict[str, Any]]
    confidence_level: ConfidenceLevel
    quality_score: float
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

class StructuredFormatter:
    """Main response formatting service."""
    
    def __init__(
        self,
        templates_dir: Optional[str] = None,
        enable_citations: bool = True,
        citation_style: str = "apa",
        max_response_length: int = 5000,
        include_quality_indicators: bool = True
    ):
        """
        Initialize structured formatter.
        
        Args:
            templates_dir: Directory containing response templates
            enable_citations: Whether to include citations
            citation_style: Citation style (apa, mla, chicago)
            max_response_length: Maximum response length
            include_quality_indicators: Include quality indicators in output
        """
        self.templates_dir = Path(templates_dir) if templates_dir else None
        self.enable_citations = enable_citations
        self.citation_style = citation_style
        self.max_response_length = max_response_length
        self.include_quality_indicators = include_quality_indicators
        
        # Load templates
        self.templates = self._load_templates()
        
        # Citation counter for numbered references
        self.citation_counter = 0
        
        logger.info("Structured Formatter initialized")
    
    def format_response(
        self,
        rag_response: Dict[str, Any],
        format_type: ResponseFormat = ResponseFormat.STRUCTURED_JSON,
        template_name: Optional[str] = None,
        custom_options: Optional[Dict[str, Any]] = None
    ) -> FormattedResponse:
        """
        Format RAG response into specified format.
        
        Args:
            rag_response: RAG pipeline response
            format_type: Desired output format
            template_name: Optional custom template name
            custom_options: Additional formatting options
            
        Returns:
            Formatted response
        """
        logger.info(f"Formatting response as {format_type.value}")
        
        # Reset citation counter
        self.citation_counter = 0
        
        # Extract response components
        query = rag_response.get('query', '')
        answer = rag_response.get('answer', '')
        confidence = rag_response.get('confidence', 0.0)
        sources = rag_response.get('sources', [])
        metadata = rag_response.get('metadata', {})
        
        # Determine confidence level
        confidence_level = self._get_confidence_level(confidence)
        
        # Calculate quality score
        quality_score = self._calculate_quality_score(rag_response)
        
        # Format based on type
        if format_type == ResponseFormat.JSON:
            content = self._format_json(rag_response)
        elif format_type == ResponseFormat.MARKDOWN:
            content = self._format_markdown(rag_response, template_name)
        elif format_type == ResponseFormat.HTML:
            content = self._format_html(rag_response, template_name)
        elif format_type == ResponseFormat.PLAIN_TEXT:
            content = self._format_plain_text(rag_response)
        elif format_type == ResponseFormat.STRUCTURED_JSON:
            content = self._format_structured_json(rag_response)
        elif format_type == ResponseFormat.CITATION_FORMAT:
            content = self._format_citation_style(rag_response)
        else:
            raise ValueError(f"Unsupported format type: {format_type}")
        
        # Apply custom options if provided
        if custom_options:
            content = self._apply_custom_options(content, custom_options)
        
        # Validate and truncate if necessary
        content = self._validate_and_truncate(content, format_type)
        
        # Prepare formatted sources
        formatted_sources = self._format_sources(sources, format_type)
        
        # Build metadata
        format_metadata = {
            'original_metadata': metadata,
            'formatting': {
                'format_type': format_type.value,
                'template_used': template_name,
                'formatted_at': datetime.now().isoformat(),
                'quality_indicators_included': self.include_quality_indicators,
                'citations_enabled': self.enable_citations,
                'citation_style': self.citation_style if self.enable_citations else None
            },
            'content_stats': {
                'character_count': len(content),
                'word_count': len(content.split()),
                'source_count': len(sources)
            }
        }
        
        return FormattedResponse(
            content=content,
            format_type=format_type,
            metadata=format_metadata,
            sources=formatted_sources,
            confidence_level=confidence_level,
            quality_score=quality_score
        )
    
    def _format_json(self, rag_response: Dict[str, Any]) -> str:
        """Format as simple JSON."""
        return json.dumps(rag_response, indent=2, ensure_ascii=False)
    
    def _format_structured_json(self, rag_response: Dict[str, Any]) -> str:
        """Format as structured JSON with enhanced metadata."""
        structured = {
            "response": {
                "query": rag_response.get('query', ''),
                "answer": self._process_answer_text(rag_response.get('answer', '')),
                "confidence": {
                    "score": rag_response.get('confidence', 0.0),
                    "level": self._get_confidence_level(rag_response.get('confidence', 0.0)).value,
                    "explanation": self._get_confidence_explanation(rag_response.get('confidence', 0.0))
                },
                "quality_metrics": {
                    "relevance_score": rag_response.get('relevance_score', 0.0),
                    "coherence_score": rag_response.get('coherence_score', 0.0),
                    "overall_quality": self._calculate_quality_score(rag_response)
                }
            },
            "sources": self._format_sources_structured(rag_response.get('sources', [])),
            "performance": {
                "retrieval_time": rag_response.get('retrieval_time', 0.0),
                "generation_time": rag_response.get('generation_time', 0.0),
                "total_time": rag_response.get('total_time', 0.0)
            },
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "pipeline_info": rag_response.get('metadata', {}),
                "formatting_version": "1.0.0"
            }
        }
        
        if self.include_quality_indicators:
            structured["quality_indicators"] = self._generate_quality_indicators(rag_response)
        
        return json.dumps(structured, indent=2, ensure_ascii=False)
    
    def _format_markdown(self, rag_response: Dict[str, Any], template_name: Optional[str] = None) -> str:
        """Format as Markdown."""
        if template_name and template_name in self.templates:
            return self._apply_template(self.templates[template_name], rag_response)
        
        # Default Markdown format
        query = rag_response.get('query', '')
        answer = self._process_answer_text(rag_response.get('answer', ''))
        confidence = rag_response.get('confidence', 0.0)
        sources = rag_response.get('sources', [])
        
        md_parts = []
        
        # Header
        md_parts.append(f"# Response to: {query}\n")
        
        # Quality indicators
        if self.include_quality_indicators:
            confidence_level = self._get_confidence_level(confidence)
            md_parts.append(f"**Confidence Level:** {confidence_level.value.title()} ({confidence:.2f})")
            md_parts.append(f"**Quality Score:** {self._calculate_quality_score(rag_response):.2f}\n")
        
        # Main answer
        md_parts.append("## Answer\n")
        md_parts.append(answer)
        
        # Sources section
        if sources and self.enable_citations:
            md_parts.append("\n## Sources\n")
            for i, source in enumerate(sources, 1):
                source_md = f"{i}. **{source.get('document_id', 'Unknown')}**"
                if 'relevance_score' in source:
                    source_md += f" (Relevance: {source['relevance_score']:.2f})"
                source_md += f"\n   {source.get('content_preview', '')}\n"
                md_parts.append(source_md)
        
        # Performance info
        if 'total_time' in rag_response:
            md_parts.append(f"\n---\n*Response generated in {rag_response['total_time']:.2f} seconds*")
        
        return "\n".join(md_parts)
    
    def _format_html(self, rag_response: Dict[str, Any], template_name: Optional[str] = None) -> str:
        """Format as HTML."""
        # First create markdown, then convert to HTML
        markdown_content = self._format_markdown(rag_response, template_name)
        
        try:
            # Convert markdown to HTML
            html_content = markdown.markdown(markdown_content, extensions=['tables', 'codehilite'])
            
            # Wrap in basic HTML structure
            full_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>RAG Response</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
        .confidence-high {{ color: #28a745; }}
        .confidence-medium {{ color: #ffc107; }}
        .confidence-low {{ color: #fd7e14; }}
        .confidence-very-low {{ color: #dc3545; }}
        .quality-indicators {{ background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; }}
        .sources {{ background-color: #e9ecef; padding: 15px; border-radius: 5px; }}
        code {{ background-color: #f1f3f4; padding: 2px 4px; border-radius: 3px; }}
        pre {{ background-color: #f1f3f4; padding: 10px; border-radius: 5px; overflow-x: auto; }}
    </style>
</head>
<body>
{html_content}
</body>
</html>
"""
            return full_html
            
        except Exception as e:
            logger.warning(f"HTML conversion failed: {e}, returning plain HTML")
            # Fallback to simple HTML conversion
            return self._simple_html_conversion(rag_response)
    
    def _format_plain_text(self, rag_response: Dict[str, Any]) -> str:
        """Format as plain text."""
        query = rag_response.get('query', '')
        answer = self._process_answer_text(rag_response.get('answer', ''))
        confidence = rag_response.get('confidence', 0.0)
        sources = rag_response.get('sources', [])
        
        text_parts = []
        
        # Header
        text_parts.append(f"QUESTION: {query}")
        text_parts.append("=" * 50)
        
        # Quality info
        if self.include_quality_indicators:
            confidence_level = self._get_confidence_level(confidence)
            text_parts.append(f"CONFIDENCE: {confidence_level.value.upper()} ({confidence:.2f})")
            text_parts.append(f"QUALITY SCORE: {self._calculate_quality_score(rag_response):.2f}")
            text_parts.append("")
        
        # Answer
        text_parts.append("ANSWER:")
        text_parts.append(answer)
        
        # Sources
        if sources and self.enable_citations:
            text_parts.append("\nSOURCES:")
            text_parts.append("-" * 20)
            for i, source in enumerate(sources, 1):
                source_text = f"[{i}] {source.get('document_id', 'Unknown')}"
                if 'relevance_score' in source:
                    source_text += f" (Relevance: {source['relevance_score']:.2f})"
                text_parts.append(source_text)
                if source.get('content_preview'):
                    text_parts.append(f"    {source['content_preview']}")
                text_parts.append("")
        
        return "\n".join(text_parts)
    
    def _format_citation_style(self, rag_response: Dict[str, Any]) -> str:
        """Format with academic citations."""
        answer = self._process_answer_text(rag_response.get('answer', ''))
        sources = rag_response.get('sources', [])
        
        # Add inline citations to answer
        cited_answer = self._add_inline_citations(answer, sources)
        
        # Generate bibliography
        bibliography = self._generate_bibliography(sources)
        
        # Combine
        formatted_response = f"{cited_answer}\n\n## References\n\n{bibliography}"
        
        return formatted_response
    
    def _process_answer_text(self, answer: str) -> str:
        """Process and clean answer text."""
        # Remove excessive whitespace
        answer = re.sub(r'\n\s*\n', '\n\n', answer)
        answer = re.sub(r' +', ' ', answer)
        
        # Ensure proper sentence ending
        if not answer.endswith(('.', '!', '?')):
            answer += '.'
        
        return answer.strip()
    
    def _get_confidence_level(self, confidence: float) -> ConfidenceLevel:
        """Convert confidence score to level."""
        if confidence > 0.8:
            return ConfidenceLevel.HIGH
        elif confidence > 0.5:
            return ConfidenceLevel.MEDIUM
        elif confidence > 0.3:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW
    
    def _get_confidence_explanation(self, confidence: float) -> str:
        """Get explanation for confidence level."""
        level = self._get_confidence_level(confidence)
        
        explanations = {
            ConfidenceLevel.HIGH: "High confidence - Strong alignment between query and retrieved documents",
            ConfidenceLevel.MEDIUM: "Medium confidence - Good alignment with some uncertainty",
            ConfidenceLevel.LOW: "Low confidence - Limited alignment or insufficient context",
            ConfidenceLevel.VERY_LOW: "Very low confidence - Poor alignment or lack of relevant information"
        }
        
        return explanations[level]
    
    def _calculate_quality_score(self, rag_response: Dict[str, Any]) -> float:
        """Calculate overall quality score."""
        confidence = rag_response.get('confidence', 0.0)
        relevance = rag_response.get('relevance_score', 0.0)
        coherence = rag_response.get('coherence_score', 0.0)
        
        # Weighted average
        quality = (confidence * 0.4 + relevance * 0.3 + coherence * 0.3)
        return round(quality, 2)
    
    def _format_sources(self, sources: List[Dict[str, Any]], format_type: ResponseFormat) -> List[Dict[str, Any]]:
        """Format sources based on output format."""
        formatted_sources = []
        
        for i, source in enumerate(sources):
            formatted_source = {
                'index': i + 1,
                'document_id': source.get('document_id', 'Unknown'),
                'relevance_score': source.get('relevance_score', 0.0),
                'content_preview': source.get('content_preview', ''),
                'metadata': source.get('metadata', {})
            }
            
            # Add format-specific fields
            if format_type in [ResponseFormat.HTML, ResponseFormat.MARKDOWN]:
                formatted_source['citation'] = self._generate_citation(source, i + 1)
            
            formatted_sources.append(formatted_source)
        
        return formatted_sources
    
    def _format_sources_structured(self, sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format sources for structured JSON output."""
        structured_sources = []
        
        for i, source in enumerate(sources):
            structured_source = {
                'id': i + 1,
                'document': {
                    'id': source.get('document_id', 'Unknown'),
                    'type': source.get('metadata', {}).get('file_type', 'unknown'),
                    'title': source.get('metadata', {}).get('title', 'Unknown Document')
                },
                'relevance': {
                    'score': source.get('relevance_score', 0.0),
                    'rank': i + 1,
                    'explanation': self._get_relevance_explanation(source.get('relevance_score', 0.0))
                },
                'content': {
                    'preview': source.get('content_preview', ''),
                    'chunk_index': source.get('chunk_index', 0),
                    'length': len(source.get('content_preview', ''))
                },
                'metadata': source.get('metadata', {})
            }
            
            structured_sources.append(structured_source)
        
        return structured_sources
    
    def _get_relevance_explanation(self, score: float) -> str:
        """Get explanation for relevance score."""
        if score > 0.8:
            return "Highly relevant to the query"
        elif score > 0.6:
            return "Moderately relevant to the query"
        elif score > 0.4:
            return "Somewhat relevant to the query"
        else:
            return "Limited relevance to the query"
    
    def _generate_quality_indicators(self, rag_response: Dict[str, Any]) -> Dict[str, Any]:
        """Generate quality indicators for response."""
        return {
            'confidence_assessment': {
                'score': rag_response.get('confidence', 0.0),
                'level': self._get_confidence_level(rag_response.get('confidence', 0.0)).value,
                'factors': [
                    "Document relevance to query",
                    "Response coherence and completeness",
                    "Source quality and reliability"
                ]
            },
            'content_quality': {
                'relevance_score': rag_response.get('relevance_score', 0.0),
                'coherence_score': rag_response.get('coherence_score', 0.0),
                'source_count': len(rag_response.get('sources', [])),
                'response_length': len(rag_response.get('answer', ''))
            },
            'recommendations': self._generate_quality_recommendations(rag_response)
        }
    
    def _generate_quality_recommendations(self, rag_response: Dict[str, Any]) -> List[str]:
        """Generate quality-based recommendations."""
        recommendations = []
        confidence = rag_response.get('confidence', 0.0)
        sources = rag_response.get('sources', [])
        
        if confidence < 0.5:
            recommendations.append("Consider rephrasing your question for better results")
        
        if len(sources) < 3:
            recommendations.append("Limited source material available - consider adding more documents")
        
        if rag_response.get('relevance_score', 0.0) < 0.6:
            recommendations.append("Query may be too specific or outside document scope")
        
        if not recommendations:
            recommendations.append("Response quality is good - no specific recommendations")
        
        return recommendations
    
    def _add_inline_citations(self, text: str, sources: List[Dict[str, Any]]) -> str:
        """Add inline citations to text."""
        # Simple citation insertion (can be improved with better NLP)
        cited_text = text
        
        for i, source in enumerate(sources, 1):
            # Look for sentences that might reference this source
            document_id = source.get('document_id', '').lower()
            if document_id in text.lower():
                # Add citation marker
                cited_text = cited_text.replace(
                    document_id,
                    f"{document_id} [{i}]",
                    1  # Only replace first occurrence
                )
        
        return cited_text
    
    def _generate_bibliography(self, sources: List[Dict[str, Any]]) -> str:
        """Generate bibliography in specified citation style."""
        bibliography_entries = []
        
        for i, source in enumerate(sources, 1):
            citation = self._generate_citation(source, i)
            bibliography_entries.append(citation)
        
        return '\n'.join(bibliography_entries)
    
    def _generate_citation(self, source: Dict[str, Any], index: int) -> str:
        """Generate citation in specified style."""
        document_id = source.get('document_id', 'Unknown')
        metadata = source.get('metadata', {})
        
        if self.citation_style == 'apa':
            # APA style citation
            title = metadata.get('title', document_id)
            author = metadata.get('author', 'Unknown Author')
            return f"[{index}] {author}. {title}."
        
        elif self.citation_style == 'mla':
            # MLA style citation
            title = metadata.get('title', document_id)
            author = metadata.get('author', 'Unknown Author')
            return f"[{index}] {author}. \"{title}.\""
        
        else:
            # Simple citation
            return f"[{index}] {document_id}"
    
    def _simple_html_conversion(self, rag_response: Dict[str, Any]) -> str:
        """Simple HTML conversion fallback."""
        query = html.escape(rag_response.get('query', ''))
        answer = html.escape(rag_response.get('answer', ''))
        
        html_content = f"""
        <div class="rag-response">
            <h2>Question: {query}</h2>
            <div class="answer">
                {answer.replace('\n', '<br>')}
            </div>
        </div>
        """
        
        return html_content
    
    def _load_templates(self) -> Dict[str, str]:
        """Load formatting templates from directory."""
        templates = {}
        
        if self.templates_dir and self.templates_dir.exists():
            for template_file in self.templates_dir.glob("*.template"):
                try:
                    with open(template_file, 'r', encoding='utf-8') as f:
                        template_name = template_file.stem
                        templates[template_name] = f.read()
                except Exception as e:
                    logger.warning(f"Failed to load template {template_file}: {e}")
        
        return templates
    
    def _apply_template(self, template: str, rag_response: Dict[str, Any]) -> str:
        """Apply template to RAG response."""
        # Simple template variable substitution
        variables = {
            'query': rag_response.get('query', ''),
            'answer': rag_response.get('answer', ''),
            'confidence': rag_response.get('confidence', 0.0),
            'confidence_level': self._get_confidence_level(rag_response.get('confidence', 0.0)).value,
            'quality_score': self._calculate_quality_score(rag_response),
            'source_count': len(rag_response.get('sources', [])),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        formatted_template = template
        for key, value in variables.items():
            formatted_template = formatted_template.replace(f'{{{key}}}', str(value))
        
        return formatted_template
    
    def _apply_custom_options(self, content: str, options: Dict[str, Any]) -> str:
        """Apply custom formatting options."""
        # Truncate if requested
        if 'max_length' in options:
            content = content[:options['max_length']]
        
        # Add prefix/suffix
        if 'prefix' in options:
            content = options['prefix'] + content
        if 'suffix' in options:
            content = content + options['suffix']
        
        return content
    
    def _validate_and_truncate(self, content: str, format_type: ResponseFormat) -> str:
        """Validate and truncate content if necessary."""
        if len(content) > self.max_response_length:
            logger.warning(f"Response truncated from {len(content)} to {self.max_response_length} characters")
            content = content[:self.max_response_length - 50] + "\n\n[Response truncated...]"
        
        return content

# Factory function
def create_structured_formatter(**kwargs) -> StructuredFormatter:
    """Create structured formatter with default configuration."""
    return StructuredFormatter(**kwargs)

# Export main classes
__all__ = [
    "StructuredFormatter",
    "FormattedResponse",
    "ResponseFormat",
    "ConfidenceLevel",
    "create_structured_formatter"
]