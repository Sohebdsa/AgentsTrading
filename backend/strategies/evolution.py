from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.models import Strategy

class StrategyEvolutionEngine:
    """
    Evaluates paper-trading performance, prunes failing strategies, 
    and generates mutated variations to compete.
    """
    def __init__(self, session: AsyncSession):
        self.session = session
        
    async def evaluate_and_evolve(self) -> None:
        print("Running Strategy Evolution Engine...")
        
        result = await self.session.execute(
            select(Strategy).where(Strategy.is_active == True)
        )
        strategies = result.scalars().all()
        
        if not strategies:
            # Seed initial strategy
            print("No active strategies found. Seeding Genesis Strategy.")
            genesis = Strategy(
                name="Genesis_Alpha",
                description="Default weights (0.4 tech, 0.35 flow, 0.25 sent)",
                parameters='{"tech": 0.4, "flow": 0.35, "sent": 0.25}'
            )
            self.session.add(genesis)
            await self.session.commit()
            return
            
        # Mock Evolution Logic
        # 1. Rank by profit & win rate
        strategies.sort(key=lambda x: (x.profit, x.win_rate), reverse=True)
        
        # 2. Cull the bottom 20%
        num_to_cull = max(1, len(strategies) // 5)
        if len(strategies) > 3:
            for strat in strategies[-num_to_cull:]:
                print(f"Pruning poor strategy: {strat.name} (Profit: {strat.profit})")
                strat.is_active = False
                
        # 3. Mutate the top performer
        top_strat = strategies[0]
        if len(strategies) < 5 and top_strat.total_trades > 5:
            print(f"Mutating top strategy: {top_strat.name}...")
            # Example mutation (adjust weights slightly, use LLM in real system)
            mutated = Strategy(
                name=f"{top_strat.name}_Mutated_v1",
                description="Mutated variant prioritizing Technicals heavily",
                parameters='{"tech": 0.6, "flow": 0.2, "sent": 0.2}'
            )
            self.session.add(mutated)
            
        await self.session.commit()
