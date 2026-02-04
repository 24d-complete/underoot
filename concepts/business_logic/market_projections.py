import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import seaborn as sns
import pandas as pd
import numpy as np
import os

# --- Configuration ---
OUTPUT_DIR = 'concepts/business_logic'
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# --- Style Configuration: "The Consultant" ---
# Minimalist, clean lines, high contrast
sns.set_theme(style="white", rc={
    "axes.spines.right": False,
    "axes.spines.top": False,
    "axes.grid": True,
    "grid.color": "#f0f0f0",
    "font.family": "sans-serif",
})
PALETTE_PRIMARY = ["#2c3e50", "#e74c3c", "#3498db"] # Dark Slate, Alizarin, Peter River

def format_currency(x, pos):
    if x >= 1e6:
        return '${:1.1f}M'.format(x*1e-6)
    return '${:1.0f}K'.format(x*1e-3)

def plot_adoption_s_curve():
    """
    Simulates Viral Adoption (Logistic Function)
    Rationale: SaaS adoption in constrained environments (universities) follows an S-curve.
    """
    t = np.linspace(0, 36, 100) # 3 years (36 months)
    K = 50000 # Carrying capacity (initial beachhead market)
    P0 = 500  # Initial users
    r = 0.15   # Growth rate (viral coefficient impact)
    
    # Logistic Function
    users = K / (1 + ((K - P0) / P0) * np.exp(-r * t))
    
    data = pd.DataFrame({'Month': t, 'Active Users': users})
    
    plt.figure(figsize=(10, 6))
    ax = sns.lineplot(data=data, x='Month', y='Active Users', color="#2980b9", linewidth=3)
    
    # Annotate Phases
    plt.axvline(x=6, color='#95a5a6', linestyle='--', alpha=0.5)
    plt.text(3, 30000, 'Phase 1:\nEarly Adopters', ha='center', color='#7f8c8d')
    
    plt.axvline(x=18, color='#95a5a6', linestyle='--', alpha=0.5)
    plt.text(12, 30000, 'Phase 2:\nViral Growth\n(The Chasm)', ha='center', color='#7f8c8d')
    
    plt.text(28, 30000, 'Phase 3:\nMarket Saturation', ha='center', color='#7f8c8d')

    plt.title('Projected User Adoption (3-Year Forecast)', fontsize=14, fontweight='bold', pad=20, loc='left')
    plt.ylabel('Active Monthly Users', fontsize=12)
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, p: format(int(x), ',')))
    
    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/adoption_curve.png', dpi=300)
    print(f"Generated {OUTPUT_DIR}/adoption_curve.png")
    plt.close()

def plot_tam_sam_som():
    """
    TAM/SAM/SOM Visualization
    Rationale: Bottom-up market sizing.
    """
    # Data in Millions USD
    categories = ['TAM', 'SAM', 'SOM']
    values = [1200, 450, 45] 
    labels = [
        'Total Addressable Market\n(Academic Software Global)',
        'Serviceable Available Market\n(Code-First Researchers)',
        'Serviceable Obtainable Market\n(Target: Year 3)'
    ]
    
    colors = ['#ecf0f1', '#bdc3c7', '#2c3e50']
    
    fig, ax = plt.subplots(figsize=(8, 8))
    
    # Create concentric circles
    for i, (val, color, label) in enumerate(zip(values, colors, categories)):
        # We plot bars but make them look like nested boxes or just simple bars comparison
        # Actually, a standard bar chart is cleaner for MBA reports than circles which mislead on area
        pass
        
    # Let's do a waterfall or simple bar for clarity
    plt.figure(figsize=(10, 6))
    bars = plt.bar(categories, values, color=['#95a5a6', '#34495e', '#e74c3c'])
    
    # Add value labels
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height + 20,
                 f'${height}M',
                 ha='center', va='bottom', fontsize=12, fontweight='bold')
        
    # Add descriptive text below x-axis
    # (Simplified for script)
    
    plt.title('Market Sizing: The "Code-First" Niche', fontsize=14, fontweight='bold', pad=20, loc='left')
    plt.ylabel('Annual Revenue Potential (USD)', fontsize=12)
    
    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/market_sizing.png', dpi=300)
    print(f"Generated {OUTPUT_DIR}/market_sizing.png")
    plt.close()

def plot_financial_projections():
    """
    3-Year P&L Model
    Rationale: Freemium conversion + Enterprise SaaS
    """
    years = ['Year 1', 'Year 2', 'Year 3']
    # Revised Projections: Slower revenue ramp due to "Free AI" subsidy (Breakeven Strategy)
    revenue = [30000, 300000, 1500000] 
    # Expenses higher due to Gemini API costs ($0.01/user)
    expenses = [30000, 290000, 1400000] 
    profit = [r - e for r, e in zip(revenue, expenses)]
    
    x = np.arange(len(years))
    width = 0.35
    
    fig, ax = plt.subplots(figsize=(10, 6))
    rects1 = ax.bar(x - width/2, revenue, width, label='Revenue', color='#2ecc71')
    rects2 = ax.bar(x + width/2, expenses, width, label='Expenses', color='#e74c3c')
    
    # Plot Profit Line
    ax.plot(x, profit, color='#2c3e50', marker='o', linewidth=2, label='Net Profit')
    
    ax.set_title('Financial Projections (P&L)', fontsize=14, fontweight='bold', pad=20, loc='left')
    ax.set_xticks(x)
    ax.set_xticklabels(years)
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(format_currency))
    ax.legend()
    
    plt.axhline(0, color='black', linewidth=0.8)
    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/financial_projections.png', dpi=300)
    print(f"Generated {OUTPUT_DIR}/financial_projections.png")
    plt.close()

def plot_competitive_scatter():
    """
    Blue Ocean Strategy Canvas
    X: Setup Friction (Low to High) - INVERTED for chart logic (Ease of Setup)
    Y: AI Capabilities (Low to High)
    """
    data = pd.DataFrame({
        'Product': ['Underoot', 'Overleaf', 'TeXstudio', 'Word', 'VS Code (Raw)'],
        'AI Power': [9, 3, 1, 4, 8],
        'Privacy': [10, 2, 10, 5, 10],
        'Ease of Setup': [9, 10, 2, 10, 4], # 10 = Instant, 0 = Painful
    })
    
    plt.figure(figsize=(10, 8))
    
    # Bubble chart: X=Ease, Y=AI, Size=Privacy
    sns.scatterplot(data=data, x='Ease of Setup', y='AI Power', size='Privacy', 
                    sizes=(200, 2000), hue='Product', alpha=0.7, palette='deep')
    
    # Add quadrant lines
    plt.axvline(x=5, color='gray', linestyle='--')
    plt.axhline(y=5, color='gray', linestyle='--')
    
    # Labels
    for i in range(data.shape[0]):
        plt.text(data['Ease of Setup'][i]+0.2, data['AI Power'][i], 
                 data['Product'][i], fontsize=11, fontweight='bold')
        
    plt.xlabel('Ease of Setup & Use', fontsize=12)
    plt.ylabel('AI & Agentic Capabilities', fontsize=12)
    plt.title('Competitive Matrix: The Privacy/AI Frontier', fontsize=14, fontweight='bold', loc='left')
    plt.xlim(0, 11)
    plt.ylim(0, 11)
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', borderaxespad=0.)
    
    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/competitive_matrix.png', dpi=300)
    print(f"Generated {OUTPUT_DIR}/competitive_matrix.png")
    plt.close()

if __name__ == "__main__":
    try:
        plot_adoption_s_curve()
        plot_tam_sam_som()
        plot_financial_projections()
        plot_competitive_scatter()
        print("Visualization generation complete.")
    except Exception as e:
        print(f"Error generating plots: {e}")
        import traceback
        traceback.print_exc()
