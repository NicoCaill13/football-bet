import { ApiProperty } from "@nestjs/swagger";

export class ImpliedProbsDto {
  @ApiProperty({ example: 0.3149 }) p1!: number;
  @ApiProperty({ example: 0.275 }) pX!: number;
  @ApiProperty({ example: 0.4101 }) p2!: number;
}

export class OddsTripleDto {
  @ApiProperty({ example: 3.1 }) o1!: number;
  @ApiProperty({ example: 3.6 }) oX!: number;
  @ApiProperty({ example: 2.4 }) o2!: number;
}

export class FairTripleDto {
  @ApiProperty({ example: 3.153 }) f1!: number;
  @ApiProperty({ example: 3.661 }) fX!: number;
  @ApiProperty({ example: 2.441 }) f2!: number;
}

export class OddsSnapshotEnrichedDto {
  @ApiProperty() id!: number;
  @ApiProperty() matchId!: number;
  @ApiProperty() book!: string;
  @ApiProperty({ type: Number, example: 3.1 }) o1!: number;
  @ApiProperty({ type: Number, example: 3.6 }) oX!: number;
  @ApiProperty({ type: Number, example: 2.4 }) o2!: number;
  @ApiProperty({ type: String, format: "date-time" }) sampledAt!: string;
  @ApiProperty({ type: ImpliedProbsDto }) implied!: ImpliedProbsDto;
  @ApiProperty({ type: ImpliedProbsDto }) impliedNormalized!: ImpliedProbsDto;
}

export class BestOddsDto {
  @ApiProperty({ type: Number }) o1!: number;
  @ApiProperty({ type: Number }) oX!: number;
  @ApiProperty({ type: Number }) o2!: number;
  @ApiProperty({ type: ImpliedProbsDto }) implied!: ImpliedProbsDto;
  @ApiProperty({ type: ImpliedProbsDto }) impliedNormalized!: ImpliedProbsDto;
}

export class DoubleChanceDto {
  @ApiProperty({ example: "21" }) legs!: string;
  @ApiProperty({ example: 0.7269 }) probability!: number;
  @ApiProperty({ example: 1.376 }) fairOdds!: number;
}

export class FairOddsResponseDto {
  @ApiProperty({ enum: ["latest", "best"] }) using!: "latest" | "best";
  @ApiProperty({ type: OddsTripleDto }) odds!: OddsTripleDto;
  @ApiProperty({ type: ImpliedProbsDto }) probabilities!: ImpliedProbsDto;
  @ApiProperty({ type: FairTripleDto }) fair!: FairTripleDto;

  // On garde l'objet EV tel que retourné par l'API, avec clés "1","X","2"
  @ApiProperty({
    example: { "1": 0.0123, "X": -0.007, "2": 0.004 },
    description: "EV par issue (p*odds - 1)",
    type: Object,
    additionalProperties: { type: "number" },
  })
  ev!: Record<string, number>;

  @ApiProperty({ type: DoubleChanceDto }) doubleChance!: DoubleChanceDto;
}

export class MatchLiteDto {
  @ApiProperty() id!: number;
  @ApiProperty() home!: string;
  @ApiProperty() away!: string;
  @ApiProperty({ format: "date-time" }) startsAt!: string;
}

export class UsingOddsDto {
  @ApiProperty({ enum: ["latest", "best"] }) mode!: "latest" | "best";
  @ApiProperty({ type: Number }) o1!: number;
  @ApiProperty({ type: Number }) oX!: number;
  @ApiProperty({ type: Number }) o2!: number;
}

export class StakeDto {
  @ApiProperty({ example: 0.0042, description: "Fraction de bankroll à miser" })
  suggestedFraction!: number;
  @ApiProperty({ example: "cap=0.02, kelly=0.0210" }) note!: string;
}

export class AlternativeDcDto {
  @ApiProperty({ example: "21" }) doubleChance!: string;
  @ApiProperty({ example: 1.379 }) fairOdds!: number;
  @ApiProperty({ example: 0.7252 }) probability!: number;
}

export class DecisionResultDto {
  @ApiProperty({ type: MatchLiteDto }) match!: MatchLiteDto;
  @ApiProperty({ type: UsingOddsDto }) usingOdds!: UsingOddsDto;
  @ApiProperty({ type: ImpliedProbsDto }) probabilities_market!: ImpliedProbsDto;
  @ApiProperty({ type: ImpliedProbsDto }) probabilities_adjusted!: ImpliedProbsDto;

  @ApiProperty({
    example: { "1": 0.0562, "X": -0.0106, "2": -0.0773 },
    type: Object,
    additionalProperties: { type: "number" },
  })
  ev!: Record<string, number>;

  @ApiProperty({ enum: ["1", "X", "2"] }) pick!: "1" | "X" | "2";
  @ApiProperty({ minimum: 0, maximum: 100, example: 17 }) confidence!: number;
  @ApiProperty({ type: StakeDto }) stake!: StakeDto;
  @ApiProperty({ type: [String] }) rationale!: string[];
  @ApiProperty({ type: AlternativeDcDto }) alternative!: AlternativeDcDto;
}

export class DecisionLogRecordDto {
  @ApiProperty() id!: number;
  @ApiProperty() matchId!: number;
  @ApiProperty({ type: DecisionResultDto }) payload!: DecisionResultDto;
  @ApiProperty({ format: "date-time" }) createdAt!: string;
}
