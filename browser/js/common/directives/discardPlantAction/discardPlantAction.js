app.directive('plantDiscardAction', function(PlayGameFactory){
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/plantDiscardAction/plantDiscardAction.html',
        link: function(scope, elem, attrs){
            scope.getMyPlants = PlayGameFactory.getMyPlants;
            var plantToDiscard, index;
            
            scope.isPlantToDiscard = function(plant){
                return plant === plantToDiscard;
            }
            
            scope.setAsPlantToDiscard = function(plant, _index){
                plantToDiscard = plant;
                index = _index;
            }
            
            scope.unsetAsPlantToDiscard = function(plant, _index){
                plantToDiscard = null;
                index = null;
            }
            
            scope.choosePlantToDiscard = function(){
                var update = {
                    player: PlayGameFactory.getMe(),
                    phase: 'auction',
                    choice: {
                        index: index
                    }
                };
                PlayGameFactory.choose(update);
            }
        }
    }
})