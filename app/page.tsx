'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy, 
  Users, 
  Target, 
  Clock, 
  RotateCcw, 
  Play,
  Pause,
  BarChart3,
  User,
  Activity
} from 'lucide-react';

interface Batsman {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  howOut?: string;
}

interface Ball {
  ballNumber: number;
  overNumber: number;
  runs: number;
  type: 'normal' | 'wide' | 'noball' | 'wicket' | 'runout';
  batsman: string;
  extras?: number;
  newBatsman?: string;
}

interface MatchState {
  batsmen: {
    striker: Batsman;
    nonStriker: Batsman;
  };
  score: {
    runs: number;
    wickets: number;
    overs: number;
    balls: number;
  };
  ballLog: Ball[];
  currentOver: Ball[];
  matchStatus: 'setup' | 'batting' | 'innings-break' | 'completed';
  innings: number;
}

export default function CricketScoreLogger() {
  const [matchState, setMatchState] = useState<MatchState>({
    batsmen: {
      striker: { name: '', runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false },
      nonStriker: { name: '', runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false }
    },
    score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
    ballLog: [],
    currentOver: [],
    matchStatus: 'setup',
    innings: 1
  });

  const [showNewBatsmanDialog, setShowNewBatsmanDialog] = useState(false);
  const [newBatsmanName, setNewBatsmanName] = useState('');
  const [showOverEndDialog, setShowOverEndDialog] = useState(false);
  const [showMatchSummary, setShowMatchSummary] = useState(false);
  const [pendingWicketBall, setPendingWicketBall] = useState<Ball | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load match state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cricketMatch');
    if (saved) {
      setMatchState(JSON.parse(saved));
    }
  }, []);

  // Save match state to localStorage whenever it changes
  useEffect(() => {
    if (matchState.matchStatus !== 'setup') {
      localStorage.setItem('cricketMatch', JSON.stringify(matchState));
    }
  }, [matchState]);

  const startMatch = () => {
    if (matchState.batsmen.striker.name && matchState.batsmen.nonStriker.name) {
      setMatchState(prev => ({
        ...prev,
        matchStatus: 'batting'
      }));
    }
  };

  const addBall = useCallback((runs: number, type: 'normal' | 'wide' | 'noball' | 'wicket' | 'runout', extras: number = 0) => {
    // Prevent double execution
    if (isProcessing) return;
    setIsProcessing(true);

    // Calculate ball number for this delivery
    const currentBallInOver = type === 'normal' || type === 'wicket' || type === 'runout' ? 
      matchState.score.balls + 1 : matchState.score.balls;
    
    const ball: Ball = {
      ballNumber: currentBallInOver,
      overNumber: matchState.score.overs + 1,
      runs,
      type,
      batsman: matchState.batsmen.striker.name,
      extras
    };

    if (type === 'wicket' || type === 'runout') {
      setPendingWicketBall(ball);
      setShowNewBatsmanDialog(true);
      setIsProcessing(false);
      return;
    }

    // Process the ball immediately for non-wickets
    setMatchState(prev => {
      const newState = { ...prev };
      console.log(newState.ballLog);
      // Add to ball logs
      newState.ballLog = [...prev.ballLog, ball];
      newState.currentOver = [...prev.currentOver, ball];
      console.log(newState.ballLog);
      console.log(newState);

      // Update team score
      newState.score.runs += ball.runs + (ball.extras || 0);

      // Update batsman stats for normal deliveries only
      if (ball.type === 'normal' || ball.type === 'runout') {
        newState.batsmen.striker.runs += ball.runs;
        newState.batsmen.striker.balls += 1;
        if (ball.runs === 4) newState.batsmen.striker.fours += 1;
        if (ball.runs === 6) newState.batsmen.striker.sixes += 1;
      }

      // Handle ball count progression
      if (ball.type === 'normal') {
        newState.score.balls += 1;
        
        // Rotate strike for odd runs
        if (ball.runs % 2 === 1) {
          [newState.batsmen.striker, newState.batsmen.nonStriker] = 
          [newState.batsmen.nonStriker, newState.batsmen.striker];
        }

        // Check for over completion
        if (newState.score.balls === 6) {
          newState.score.overs += 1;
          newState.score.balls = 0;
          
          // Rotate strike at end of over
          [newState.batsmen.striker, newState.batsmen.nonStriker] = 
          [newState.batsmen.nonStriker, newState.batsmen.striker];
          
          setTimeout(() => setShowOverEndDialog(true), 100);
        }
      }
      // For wides and noballs, don't increment ball count

      return newState;
    });

    setIsProcessing(false);
  }, [matchState.score.balls, matchState.score.overs, matchState.batsmen.striker.name, isProcessing]);

  const confirmNewBatsman = () => {
    if (pendingWicketBall && newBatsmanName && !isProcessing) {
      setIsProcessing(true);
      
      setMatchState(prev => {
        const newState = { ...prev };
        
        // Add wicket ball to logs
        newState.ballLog = [...prev.ballLog, pendingWicketBall];
        newState.currentOver = [...prev.currentOver, pendingWicketBall];

        // Update team score
        newState.score.runs += pendingWicketBall.runs;
        newState.score.wickets += 1;
        newState.score.balls += 1;

        // Mark current striker as out and replace with new batsman
        newState.batsmen.striker = {
          name: newBatsmanName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false
        };

        // Check for over completion
        if (newState.score.balls === 6) {
          newState.score.overs += 1;
          newState.score.balls = 0;
          
          // Rotate strike at end of over
          [newState.batsmen.striker, newState.batsmen.nonStriker] = 
          [newState.batsmen.nonStriker, newState.batsmen.striker];
          
          setTimeout(() => setShowOverEndDialog(true), 100);
        }

        return newState;
      });

      // Clear pending state
      setPendingWicketBall(null);
      setNewBatsmanName('');
      setShowNewBatsmanDialog(false);
      setIsProcessing(false);
    }
  };

  const continueInnings = () => {
    setMatchState(prev => ({
      ...prev,
      currentOver: []
    }));
    setShowOverEndDialog(false);
  };

  const endInnings = () => {
    setMatchState(prev => ({
      ...prev,
      matchStatus: 'completed',
      currentOver: []
    }));
    setShowOverEndDialog(false);
    setShowMatchSummary(true);
  };

  const resetMatch = () => {
    setMatchState({
      batsmen: {
        striker: { name: '', runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false },
        nonStriker: { name: '', runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false }
      },
      score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      ballLog: [],
      currentOver: [],
      matchStatus: 'setup',
      innings: 1
    });
    localStorage.removeItem('cricketMatch');
    setShowMatchSummary(false);
    setIsProcessing(false);
  };

  const getStrikeRate = (batsman: Batsman) => {
    return batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0';
  };

  const getCurrentRunRate = () => {
    const totalBalls = matchState.score.overs * 6 + matchState.score.balls;
    return totalBalls > 0 ? ((matchState.score.runs / totalBalls) * 6).toFixed(2) : '0.00';
  };

  if (matchState.matchStatus === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Trophy className="h-8 w-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">CricScore</h1>
            </div>
            <p className="text-gray-600">Professional ball-by-ball scoring system</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Opening Batsmen</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="striker">Striker (On Strike)</Label>
                <Input
                  id="striker"
                  placeholder="Enter striker's name"
                  value={matchState.batsmen.striker.name}
                  onChange={(e) => setMatchState(prev => ({
                    ...prev,
                    batsmen: {
                      ...prev.batsmen,
                      striker: { ...prev.batsmen.striker, name: e.target.value }
                    }
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nonStriker">Non-Striker</Label>
                <Input
                  id="nonStriker"
                  placeholder="Enter non-striker's name"
                  value={matchState.batsmen.nonStriker.name}
                  onChange={(e) => setMatchState(prev => ({
                    ...prev,
                    batsmen: {
                      ...prev.batsmen,
                      nonStriker: { ...prev.batsmen.nonStriker, name: e.target.value }
                    }
                  }))}
                />
              </div>

              <Button 
                onClick={startMatch}
                disabled={!matchState.batsmen.striker.name || !matchState.batsmen.nonStriker.name}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Match
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showMatchSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Trophy className="h-8 w-8 text-amber-600" />
              <h1 className="text-3xl font-bold text-gray-900">Match Summary</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Final Score</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold text-green-600">
                    {matchState.score.runs}/{matchState.score.wickets}
                  </div>
                  <div className="text-lg text-gray-600">
                    ({matchState.score.overs}.{matchState.score.balls} overs)
                  </div>
                  <div className="text-sm text-gray-500">
                    Run Rate: {getCurrentRunRate()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Batting Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{matchState.batsmen.striker.name}</span>
                    <Badge variant={matchState.batsmen.striker.isOut ? "destructive" : "secondary"}>
                      {matchState.batsmen.striker.isOut ? "Out" : "Not Out"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {matchState.batsmen.striker.runs} runs ({matchState.batsmen.striker.balls} balls, {matchState.batsmen.striker.fours}×4, {matchState.batsmen.striker.sixes}×6)
                  </div>
                  <div className="text-xs text-gray-500">
                    Strike Rate: {getStrikeRate(matchState.batsmen.striker)}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{matchState.batsmen.nonStriker.name}</span>
                    <Badge variant={matchState.batsmen.nonStriker.isOut ? "destructive" : "secondary"}>
                      {matchState.batsmen.nonStriker.isOut ? "Out" : "Not Out"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {matchState.batsmen.nonStriker.runs} runs ({matchState.batsmen.nonStriker.balls} balls, {matchState.batsmen.nonStriker.fours}×4, {matchState.batsmen.nonStriker.sixes}×6)
                  </div>
                  <div className="text-xs text-gray-500">
                    Strike Rate: {getStrikeRate(matchState.batsmen.nonStriker)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Ball by Ball Log</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {matchState.ballLog.map((ball, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        Over {ball.overNumber}.{ball.ballNumber}: {ball.batsman}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          ball.type === 'wicket' || ball.type === 'runout' ? 'destructive' : 
                          ball.type === 'wide' || ball.type === 'noball' ? 'secondary' : 
                          'outline'
                        }>
                          {ball.type === 'wicket' ? 'W' : 
                           ball.type === 'runout' ? `RO+${ball.runs}` :
                           ball.type === 'wide' ? `Wd+${ball.runs}` :
                           ball.type === 'noball' ? `Nb+${ball.runs}` :
                           ball.runs}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex justify-center space-x-4">
            <Button onClick={resetMatch} variant="outline" size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              New Match
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Match Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Activity className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Live Match</h1>
          </div>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <span>Innings {matchState.innings}</span>
            <span>|</span>
            <span>Over {matchState.score.overs}.{matchState.score.balls}</span>
            <span>|</span>
            <span>RR: {getCurrentRunRate()}</span>
          </div>
        </div>

        {/* Main Score Display */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-green-600">
                {matchState.score.runs}/{matchState.score.wickets}
              </div>
              <div className="text-xl text-gray-600">
                ({matchState.score.overs}.{matchState.score.balls} overs)
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Batting Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Current Batsmen</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-green-600">
                    {matchState.batsmen.striker.name} *
                  </span>
                  <Badge>On Strike</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {matchState.batsmen.striker.runs} ({matchState.batsmen.striker.balls}) 
                  SR: {getStrikeRate(matchState.batsmen.striker)}
                </div>
                <div className="text-xs text-gray-500">
                  4s: {matchState.batsmen.striker.fours} | 6s: {matchState.batsmen.striker.sixes}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{matchState.batsmen.nonStriker.name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {matchState.batsmen.nonStriker.runs} ({matchState.batsmen.nonStriker.balls})
                  SR: {getStrikeRate(matchState.batsmen.nonStriker)}
                </div>
                <div className="text-xs text-gray-500">
                  4s: {matchState.batsmen.nonStriker.fours} | 6s: {matchState.batsmen.nonStriker.sixes}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ball Input */}
          <Card>
            <CardHeader>
              <CardTitle>Ball Input</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3, 4, 6].map(runs => (
                  <Button
                    key={runs}
                    variant={runs === 4 || runs === 6 ? "default" : "outline"}
                    className={`h-12 text-lg font-bold ${
                      runs === 4 ? 'bg-blue-600 hover:bg-blue-700' :
                      runs === 6 ? 'bg-amber-600 hover:bg-amber-700' : ''
                    }`}
                    onClick={() => addBall(runs, 'normal')}
                    disabled={isProcessing}
                  >
                    {runs}
                  </Button>
                ))}
                
                <Button
                  variant="secondary"
                  className="h-12 text-sm font-bold"
                  disabled={isProcessing}
                  onClick={() => {
                    const runs = prompt("Enter runs for No Ball:");
                    if (runs !== null) {
                      addBall(parseInt(runs) || 0, 'noball', 1);
                    }
                  }}
                >
                  Nb+
                </Button>
                
                <Button
                  variant="secondary"
                  className="h-12 text-sm font-bold"
                  disabled={isProcessing}
                  onClick={() => {
                    const runs = prompt("Enter runs for Wide:");
                    if (runs !== null) {
                      addBall(parseInt(runs) || 0, 'wide', 1);
                    }
                  }}
                >
                  Wd+
                </Button>
                
                <Button
                  variant="destructive"
                  className="h-12 text-lg font-bold col-span-2"
                  onClick={() => addBall(0, 'wicket')}
                  disabled={isProcessing}
                >
                  Wicket
                </Button>
                <Button
                  variant="destructive"
                  className="h-12 text-lg font-bold col-span-2"
                  onClick={() => {
                    const runs = prompt("Enter runs in a run-out situation:");
                    if (runs !== null) {
                      addBall(parseInt(runs) || 0, 'runout');
                    }
                  }}
                  disabled={isProcessing}
                >
                  RunOut
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Over */}
          <Card>
            <CardHeader>
              <CardTitle>Current Over</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {matchState.currentOver.map((ball, index) => (
                  <Badge
                    key={`${ball.overNumber}-${ball.ballNumber}-${index}`}
                    variant={
                      ball.type === 'wicket' ? 'destructive' :
                      ball.type === 'runout' ? 'destructive' :
                      ball.type === 'wide' || ball.type === 'noball' ? 'secondary' :
                      ball.runs >= 4 ? 'default' : 'outline'
                    }
                    className="text-sm"
                  >
                    {ball.type === 'wicket' ? 'W' :
                     ball.type === 'runout' ? 'RO' :
                     ball.type === 'wide' ? `Wd` :
                     ball.type === 'noball' ? `Nb` :
                     ball.runs}
                  </Badge>
                ))}
              </div>
              
              {matchState.currentOver.length === 0 && (
                <p className="text-gray-500 text-sm">No balls bowled this over</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={resetMatch}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Match
          </Button>
          <Button variant="outline" onClick={() => setShowMatchSummary(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            View Summary
          </Button>
        </div>
      </div>

      {/* New Batsman Dialog */}
      <Dialog open={showNewBatsmanDialog} onOpenChange={setShowNewBatsmanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Batsman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>A wicket has fallen. Please enter the new batsman:</p>
            <Input
              placeholder="Enter new batsman's name"
              value={newBatsmanName}
              onChange={(e) => setNewBatsmanName(e.target.value)}
            />
            <Button 
              onClick={confirmNewBatsman}
              disabled={!newBatsmanName || isProcessing}
              className="w-full"
            >
              Confirm New Batsman
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Over End Dialog */}
      <Dialog open={showOverEndDialog} onOpenChange={setShowOverEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Over Complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Over {matchState.score.overs} is complete. What would you like to do?</p>
            <div className="flex space-x-2">
              <Button onClick={continueInnings} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Continue Innings
              </Button>
              <Button onClick={endInnings} variant="outline" className="flex-1">
                <Pause className="h-4 w-4 mr-2" />
                End Innings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}