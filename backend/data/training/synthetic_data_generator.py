#!/usr/bin/env python3
"""
Synthetic Data Generator for Engunity AI
======================================

Generates synthetic Q&A pairs for underrepresented modules to improve training data coverage.
"""

import json
import random
from typing import List, Dict, Tuple
from pathlib import Path
from datetime import datetime

class SyntheticDataGenerator:
    """Generate synthetic Q&A pairs for specific modules"""
    
    def __init__(self, output_dir: str = "backend/data/training/synthetic"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Blockchain-specific templates
        self.blockchain_templates = {
            'concepts': [
                ("What is {concept} in blockchain technology?", 
                 "{concept} is a fundamental concept in blockchain that {explanation}. "
                 "It plays a crucial role in {use_case} and helps ensure {benefit}."),
                
                ("How does {concept} work in {platform}?",
                 "In {platform}, {concept} works by {process}. This implementation "
                 "differs from other platforms because {difference}."),
                
                ("What are the benefits of {concept}?",
                 "The main benefits of {concept} include: 1) {benefit1}, "
                 "2) {benefit2}, and 3) {benefit3}. These advantages make it "
                 "valuable for {use_case}."),
            ],
            'implementation': [
                ("How to implement {feature} in {language}?",
                 "To implement {feature} in {language}, you can use the following approach:\n\n"
                 "```{language}\n{code_template}\n```\n\n"
                 "This code {explanation} and handles {edge_case}."),
                
                ("What's the best practice for {operation} in smart contracts?",
                 "The best practice for {operation} in smart contracts includes: "
                 "{practice1}. Additionally, you should {practice2} to ensure security."),
            ]
        }
        
        # Data pools for template filling
        self.blockchain_data = {
            'concepts': [
                'consensus mechanism', 'proof of work', 'proof of stake', 'smart contracts',
                'decentralized applications', 'tokenization', 'mining', 'hashing',
                'digital signatures', 'merkle trees', 'blockchain trilemma', 'gas fees',
                'wallet security', 'private keys', 'public keys', 'transaction validation'
            ],
            'platforms': [
                'Ethereum', 'Bitcoin', 'Binance Smart Chain', 'Polygon', 'Solana',
                'Cardano', 'Polkadot', 'Avalanche', 'Chainlink', 'Hyperledger'
            ],
            'languages': ['Solidity', 'Rust', 'JavaScript', 'Python', 'Go'],
            'features': [
                'token transfer', 'multi-signature wallet', 'voting system',
                'NFT marketplace', 'DeFi protocol', 'DAO governance', 'staking pool'
            ],
            'operations': [
                'error handling', 'gas optimization', 'access control',
                'state management', 'event logging', 'upgrade patterns'
            ]
        }
        
        # Document QA templates  
        self.document_qa_templates = {
            'text_processing': [
                ("How to {operation} in {format} files using {language}?",
                 "To {operation} in {format} files using {language}, you can use:\n\n"
                 "```{language}\n{code_example}\n```\n\n"
                 "This approach {benefits} and handles {edge_cases}."),
                
                ("What's the best way to {task} text data?",
                 "The best approach for {task} text data involves: {step1}, "
                 "followed by {step2}. Consider using {tools} for better performance."),
            ]
        }
        
        self.document_qa_data = {
            'operations': [
                'parse', 'extract text from', 'search within', 'validate',
                'convert', 'compress', 'encrypt', 'merge', 'split'
            ],
            'formats': ['PDF', 'CSV', 'JSON', 'XML', 'HTML', 'Markdown', 'DOCX'],
            'languages': ['Python', 'JavaScript', 'Java', 'C#', 'Go'],
            'tasks': [
                'clean', 'tokenize', 'normalize', 'classify', 'summarize',
                'translate', 'analyze sentiment of', 'extract entities from'
            ]
        }
    
    def generate_blockchain_qa(self, count: int = 50) -> List[Dict]:
        """Generate blockchain Q&A pairs"""
        qa_pairs = []
        
        for i in range(count):
            # Choose template category
            category = random.choice(list(self.blockchain_templates.keys()))
            template_q, template_a = random.choice(self.blockchain_templates[category])
            
            # Fill template based on category
            if category == 'concepts':
                concept = random.choice(self.blockchain_data['concepts'])
                platform = random.choice(self.blockchain_data['platforms'])
                
                question = template_q.format(
                    concept=concept,
                    platform=platform
                )
                answer = template_a.format(
                    concept=concept,
                    platform=platform,
                    explanation=f"enables {random.choice(['security', 'decentralization', 'transparency'])}",
                    use_case=f"{random.choice(['DeFi', 'NFTs', 'gaming', 'supply chain'])} applications",
                    benefit=f"{random.choice(['data integrity', 'trustless transactions', 'censorship resistance'])}",
                    process=f"{random.choice(['cryptographic validation', 'consensus algorithms', 'network verification'])}",
                    difference=f"it uses {random.choice(['different algorithms', 'unique architecture', 'novel approaches'])}",
                    benefit1=f"{random.choice(['enhanced security', 'improved scalability', 'lower costs'])}",
                    benefit2=f"{random.choice(['better performance', 'increased adoption', 'easier development'])}",
                    benefit3=f"{random.choice(['regulatory compliance', 'energy efficiency', 'user experience'])}"
                )
                
            elif category == 'implementation':
                feature = random.choice(self.blockchain_data['features'])
                language = random.choice(self.blockchain_data['languages'])
                operation = random.choice(self.blockchain_data['operations'])
                
                question = template_q.format(
                    feature=feature,
                    language=language,
                    operation=operation
                )
                
                # Generate simple code template
                if language == 'Solidity':
                    code_template = f"""contract Example {{
    function {feature.replace(' ', '')}() public {{
        // Implementation here
        require(condition, "Error message");
    }}
}}"""
                else:
                    code_template = f"""def {feature.replace(' ', '_')}():
    # Implementation for {feature}
    return result"""
                
                answer = template_a.format(
                    feature=feature,
                    language=language,
                    operation=operation,
                    code_template=code_template,
                    explanation=f"implements {feature} functionality",
                    edge_case=f"{random.choice(['input validation', 'error conditions', 'boundary cases'])}",
                    practice1=f"{random.choice(['input validation', 'access control', 'reentrancy protection'])}",
                    practice2=f"{random.choice(['use established patterns', 'test thoroughly', 'audit code'])}"
                )
            
            qa_pairs.append({
                'id': f'synthetic_blockchain_{i:03d}',
                'question': question,
                'answer': answer,
                'primary_module': 'blockchain',
                'quality_tier': 'medium',
                'source': 'synthetic_generation',
                'generated_timestamp': datetime.now().isoformat(),
                'template_category': category
            })
        
        return qa_pairs
    
    def generate_document_qa(self, count: int = 30) -> List[Dict]:
        """Generate document QA Q&A pairs"""
        qa_pairs = []
        
        for i in range(count):
            template_q, template_a = random.choice(self.document_qa_templates['text_processing'])
            
            operation = random.choice(self.document_qa_data['operations'])
            format_type = random.choice(self.document_qa_data['formats'])
            language = random.choice(self.document_qa_data['languages'])
            task = random.choice(self.document_qa_data['tasks'])
            
            question = template_q.format(
                operation=operation,
                format=format_type,
                language=language,
                task=task
            )
            
            # Generate code example
            if language == 'Python':
                code_example = f"""import pandas as pd
import {format_type.lower()}
    
def {operation}_{format_type.lower()}(file_path):
    # {operation.title()} {format_type} file
    data = {format_type.lower()}.load(file_path)
    result = process_data(data)
    return result"""
            else:
                code_example = f"""// {operation.title()} {format_type} file
function {operation}{format_type}(filePath) {{
    const data = load{format_type}(filePath);
    return processData(data);
}}"""
            
            answer = template_a.format(
                operation=operation,
                format=format_type,
                language=language,
                task=task,
                code_example=code_example,
                benefits=f"provides {random.choice(['better performance', 'easier maintenance', 'robust error handling'])}",
                edge_cases=f"{random.choice(['large files', 'malformed data', 'encoding issues'])}",
                step1=f"{random.choice(['data validation', 'preprocessing', 'format detection'])}",
                step2=f"{random.choice(['processing pipeline', 'result formatting', 'error handling'])}",
                tools=f"{random.choice(['pandas', 'regex', 'specialized libraries'])}"
            )
            
            qa_pairs.append({
                'id': f'synthetic_document_qa_{i:03d}',
                'question': question,
                'answer': answer,
                'primary_module': 'document_qa',
                'quality_tier': 'medium',
                'source': 'synthetic_generation',
                'generated_timestamp': datetime.now().isoformat(),
                'template_category': 'text_processing'
            })
        
        return qa_pairs
    
    def save_synthetic_data(self, qa_pairs: List[Dict], module_name: str):
        """Save synthetic Q&A pairs to file"""
        output_file = self.output_dir / f"synthetic_{module_name}_qa.jsonl"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for qa_pair in qa_pairs:
                f.write(json.dumps(qa_pair, ensure_ascii=False) + '\n')
        
        print(f"✅ Generated {len(qa_pairs)} synthetic {module_name} Q&A pairs")
        print(f"📁 Saved to: {output_file}")
        
        return output_file
    
    def generate_all_synthetic_data(self):
        """Generate synthetic data for all underrepresented modules"""
        print("🚀 Generating synthetic data for underrepresented modules...")
        
        # Generate blockchain data
        blockchain_qa = self.generate_blockchain_qa(50)
        self.save_synthetic_data(blockchain_qa, 'blockchain')
        
        # Generate document QA data
        document_qa = self.generate_document_qa(30)
        self.save_synthetic_data(document_qa, 'document_qa')
        
        # Summary
        total_generated = len(blockchain_qa) + len(document_qa)
        print(f"\n📊 SYNTHETIC DATA GENERATION SUMMARY:")
        print(f"   Blockchain: {len(blockchain_qa)} Q&A pairs")
        print(f"   Document QA: {len(document_qa)} Q&A pairs")
        print(f"   Total: {total_generated} Q&A pairs")
        print(f"   Output directory: {self.output_dir}")

def main():
    """Main execution function"""
    generator = SyntheticDataGenerator()
    generator.generate_all_synthetic_data()

if __name__ == "__main__":
    main()