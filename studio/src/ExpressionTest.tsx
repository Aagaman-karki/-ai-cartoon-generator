import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Character } from './Character';

const expressions = [
    'neutral',
    'shocked',
    'happy',
    'confused',
    'worried',
    'angry',
    'curious',
    'excited',
] as const;

export const ExpressionTest: React.FC = () => {
    return (
        <AbsoluteFill
            style={{
                backgroundColor: '#F1EEE8',
                fontFamily: 'Arial, sans-serif',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 35,
                    width: '100%',
                    textAlign: 'center',
                    fontSize: 42,
                    fontWeight: 800,
                    color: '#211B2B',
                }}
            >
                CHARACTER EXPRESSION TEST
            </div>

            {expressions.map((expression, index) => {
                const column = index % 4;
                const row = Math.floor(index / 4);
                const x = 240 + column * 480;
                const y = row === 0 ? 430 : 900;
                const labelY = row === 0 ? 455 : 925;

                return (
                    <React.Fragment key={expression}>
                        <Character
                            x={x}
                            y={y}
                            scale={0.75}
                            expression={expression}
                            shadow
                        />
                        <div
                            style={{
                                position: 'absolute',
                                left: x - 150,
                                top: labelY,
                                width: 300,
                                textAlign: 'center',
                                fontSize: 25,
                                fontWeight: 800,
                                letterSpacing: 2,
                                color: '#211B2B',
                            }}
                        >
                            {expression.toUpperCase()}
                        </div>
                    </React.Fragment>
                );
            })}
        </AbsoluteFill>
    );
};
