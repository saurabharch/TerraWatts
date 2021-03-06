app.directive('plantAndResourcePanel', function(SliderFactory, PlayGameFactory, $uibModal){
    return {
        restrict: "E",
        templateUrl: "js/common/directives/plantAndResourcePanel/plantAndResourcePanel.html",
        scope: {
            player: '=',
            auction: '=',
            players: '='
        },
        link: function(scope, elem, attrs){

            scope.getPlantMarket = PlayGameFactory.getPlantMarket;
            scope.getResourceMarket = PlayGameFactory.getResourceMarket;
            scope.getResourceWishlist = PlayGameFactory.getWishlist;
            scope.plantsTrueResourcesFalse = true;
            scope.open = SliderFactory.slideOut.bind(null, 'plant');
            scope.toggleArrows = SliderFactory.toggleSliderArrowsHandler('left');
            scope.plantsOrResources = 'plant';

            scope.changeView = function(view){
                scope.plantsOrResources = view;
            }
            scope.firstFourOrStepThreeOpacity = function(index){
                if(PlayGameFactory.getStep() === 3 || index < 4) return 1;
                return .5;
            }

            scope.firstFourOrStepThreeTruthyAndNotAuction = function(index){
                if(PlayGameFactory.getGamePhase() !== 'plant' || !PlayGameFactory.iAmActivePlayer()) return false;
                if(PlayGameFactory.getStep() === 3 || index < 4) return true;
                return false;
            }

            scope.resourceColors = {
                coal: '#C8824D',
                oil: 'black',
                trash: '#A8A818',
                nuke: 'red'
            };


            scope.$watch(PlayGameFactory.getGamePhase, function(newVal, oldVal) {
                if(newVal === 'plant' || newVal === 'resource') {
                    if(newVal !== oldVal || !oldVal) {
                        scope.plantsOrResources = newVal;
                    }
                }
            });

            scope.$on('changePhase', function(e, phase) {
                scope.plantsOrResources = phase;
                scope.$digest();
            });
        }
    }
})
