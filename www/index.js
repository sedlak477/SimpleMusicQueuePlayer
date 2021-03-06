var module = angular.module("simplePlayer", []);

module.factory('socket', function ($rootScope) {
    var socket = io.connect();
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
});

module.controller("index", function ($scope, $http, socket) {

    // Function definitions

    $scope.addSong = function () {
        $http.post("/addSong", { url: $scope.songUrl }).then(function (response) {
            if (response.data.result) {
                $scope.songUrl = "";
            } else
                console.warn(response.data.message);
        });
    };

    $scope.startPlayer = function () {
        $http.post("/start", {}, function (response) {
            if (!response.data.result)
                console.warn(response.data.message);
        });
    };

    $scope.stopPlayer = function () {
        $http.post("/stop", {}, function (response) {
            if (!response.data.result)
                console.warn(response.data.message);
        });
    };

    $scope.pausePlayer = function () {
        $http.post("/pause", {}, function (response) {
            if (!response.data.result)
                console.warn(response.data.message);
        });
    };

    $scope.nextSong = function () {
        $http.post("/next", {}, function (response) {
            if (!response.data.result)
                console.warn(response.data.message);
        });
    };

    $scope.setVolume = function () {
        $http.post("/volume", { volume: $scope.volume }, function (response) {
            if (!response.data.result)
                console.warn(response.data.message);
        });
    };

    $scope.removePlaylistEntry = function (index) {
        $http.delete("/queue/"+index).then(function (response) {
            if (!response.data.result)
                console.warn(response.data.message);
        });
    };

    // Event listeners

    socket.on("queueChanged", queue => $scope.playlist = queue);
    socket.on("songChanged", song => $scope.currentSong = song);
    socket.on("volumeChanged", volume => $scope.volume = volume);

    // Get Data

    $http.get("/queue").then(function (response) {
        $scope.playlist = response.data;
    });

    $http.get("/currentSong").then(function (response) {
        $scope.currentSong = response.data;
    });

    
    $http.get("/volume").then(function (response) {
        $scope.volume = response.data;
    });
});